import React, { useState, useRef } from 'react';
import './App.css';
import translations from './translations';

const API_URL = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';

function App() {
  const [language, setLanguage] = useState('en');
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const t = translations[language];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert(t.cameraError);
    }
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    
    // Detener cámara
    video.srcObject.getTracks().forEach(track => track.stop());
  };

  const processImage = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage })
      });
      
      const data = await response.json();
      setExtractedText(data.text);
    } catch (err) {
      alert(t.processError);
    }
    setLoading(false);
  };

  const speakText = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: extractedText,
          language: language === 'es-MX' ? 'es-MX' : language
        })
      });
      
      const data = await response.json();
      setAudioUrl(data.audioUrl);
      
      // Reproducir automáticamente
      if (audioRef.current) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      alert(t.speakError);
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>{t.title}</h1>
        
        <div className="language-selector">
          <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>
            English
          </button>
          <button onClick={() => setLanguage('es')} className={language === 'es' ? 'active' : ''}>
            Español
          </button>
          <button onClick={() => setLanguage('es-MX')} className={language === 'es-MX' ? 'active' : ''}>
            Español Latino
          </button>
        </div>

        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline style={{ display: capturedImage ? 'none' : 'block' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {capturedImage && <img src={capturedImage} alt="Captured" />}
        </div>

        <div className="controls">
          {!capturedImage ? (
            <>
              <button onClick={startCamera} className="btn-primary">{t.startCamera}</button>
              <button onClick={captureImage} className="btn-secondary">{t.capture}</button>
            </>
          ) : (
            <>
              <button onClick={processImage} disabled={loading} className="btn-primary">
                {loading ? t.processing : t.extractText}
              </button>
              <button onClick={() => { setCapturedImage(null); setExtractedText(''); setAudioUrl(null); }} className="btn-secondary">
                {t.retake}
              </button>
            </>
          )}
        </div>

        {extractedText && (
          <div className="text-result">
            <h2>{t.extractedText}</h2>
            <p>{extractedText}</p>
            <button onClick={speakText} disabled={loading} className="btn-speak">
              {loading ? t.processing : t.listen}
            </button>
          </div>
        )}

        <audio ref={audioRef} controls style={{ display: audioUrl ? 'block' : 'none', marginTop: '20px' }} />
      </header>
    </div>
  );
}

export default App;
