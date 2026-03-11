import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import translations from './translations';

const API_URL = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';

function App() {
  const [language, setLanguage] = useState('es-MX');
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [imageQuality, setImageQuality] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const t = translations[language];

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert(t.cameraError);
    }
  };

  const captureImage = () => {
    setCapturing(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Detener cámara
    streamRef.current.getTracks().forEach(track => track.stop());
    
    setCapturedImage(imageData);
    setCapturing(false);
    
    // Feedback sonoro
    playShutterSound();
  };

  const playShutterSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const checkImageQuality = (imageData) => {
    const img = new Image();
    img.src = imageData;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;
      
      // Calcular contraste y nitidez básica
      let sum = 0;
      let sumSq = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += brightness;
        sumSq += brightness * brightness;
      }
      
      const mean = sum / (data.length / 4);
      const variance = (sumSq / (data.length / 4)) - (mean * mean);
      const contrast = Math.sqrt(variance);
      
      if (contrast < 30) {
        setImageQuality('low');
        return false;
      }
      
      setImageQuality('good');
      return true;
    };
  };

  const processImage = async () => {
    setLoading(true);
    setLoadingMessage(t.processing);
    
    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage })
      });
      
      const data = await response.json();
      
      if (!data.text || data.text.trim().length < 10) {
        setImageQuality('low');
        alert(t.lowQualityWarning);
        setLoading(false);
        return;
      }
      
      setExtractedText(data.text);
      setImageQuality('good');
    } catch (err) {
      alert(t.processError);
    }
    setLoading(false);
    setLoadingMessage('');
  };

  const speakText = async () => {
    setLoading(true);
    setLoadingMessage(t.generatingAudio);
    
    try {
      const response = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: extractedText,
          language: language
        })
      });
      
      const data = await response.json();
      setAudioUrl(data.audioUrl);
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert(t.speakError);
    }
    setLoading(false);
    setLoadingMessage('');
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedText('');
    setAudioUrl(null);
    setImageQuality(null);
    startCamera();
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo-container">
          <img src="/ocono.png" alt="OCO-NO Logo" className="logo" />
        </div>
        
        <div className="language-selector">
          <button 
            onClick={() => setLanguage('en')} 
            className={language === 'en' ? 'active' : ''}
            aria-label="English"
          >
            English
          </button>
          <button 
            onClick={() => setLanguage('es-MX')} 
            className={language === 'es-MX' ? 'active' : ''}
            aria-label="Español Latino"
          >
            Español Latino
          </button>
        </div>

        <div className={`camera-container ${capturing ? 'capturing' : ''}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ display: capturedImage ? 'none' : 'block' }}
            aria-label="Vista de cámara"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {capturedImage && <img src={capturedImage} alt="Foto capturada" />}
          {capturing && <div className="flash-overlay"></div>}
        </div>

        {imageQuality === 'low' && (
          <div className="quality-warning" role="alert">
            ⚠️ {t.lowQualityWarning}
          </div>
        )}

        <div className="controls">
          {!capturedImage ? (
            <button 
              onClick={captureImage} 
              disabled={!cameraReady || capturing}
              className="btn-capture"
              aria-label={t.capture}
            >
              <span className="btn-icon">📸</span>
              <span className="btn-text">{t.capture}</span>
            </button>
          ) : (
            <>
              <button 
                onClick={processImage} 
                disabled={loading} 
                className="btn-primary"
                aria-label={t.extractText}
              >
                {loading && !extractedText ? (
                  <>
                    <span className="spinner"></span>
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🔍</span>
                    <span className="btn-text">{t.extractText}</span>
                  </>
                )}
              </button>
              <button 
                onClick={retakePhoto} 
                className="btn-secondary"
                aria-label={t.retake}
              >
                <span className="btn-icon">🔄</span>
                <span className="btn-text">{t.retake}</span>
              </button>
            </>
          )}
        </div>

        {loading && loadingMessage && (
          <div className="loading-indicator" role="status" aria-live="polite">
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
            <p>{loadingMessage}</p>
          </div>
        )}

        {extractedText && (
          <div className="text-result">
            <div className="audio-controls-top">
              <button 
                onClick={speakText} 
                disabled={loading} 
                className="btn-speak-large"
                aria-label={t.listen}
              >
                {loading && audioUrl === null ? (
                  <>
                    <span className="spinner"></span>
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon-large">🔊</span>
                    <span className="btn-text-large">{t.listen}</span>
                  </>
                )}
              </button>
              
              {audioUrl && (
                <audio 
                  ref={audioRef} 
                  controls 
                  className="audio-player-large"
                  aria-label="Reproductor de audio"
                />
              )}
            </div>

            <div className="text-content">
              <h2>{t.extractedText}</h2>
              <p>{extractedText}</p>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
