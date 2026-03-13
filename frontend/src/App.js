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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!cameraReady || capturing) return;
    
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

  const processImage = async () => {
    setLoading(true);
    setLoadingMessage(t.processing);
    setExtractedText('');
    setAudioUrl(null);
    
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
        setLoadingMessage('');
        return;
      }
      
      setExtractedText(data.text);
      setImageQuality('good');
      
      // Automáticamente generar y reproducir audio
      await speakText(data.text);
    } catch (err) {
      console.error('Error en processImage:', err);
      alert(t.processError);
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const speakText = async (textToSpeak = null) => {
    const text = textToSpeak || extractedText;
    setLoadingMessage(t.generatingAudio);
    
    try {
      console.log('Generando audio para texto:', text.substring(0, 100));
      
      const response = await fetch(`${API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text,
          language: language
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Respuesta de audio:', data);
      
      if (!data.audioUrl) {
        throw new Error('No se recibió URL de audio');
      }
      
      setAudioUrl(data.audioUrl);
      setLoading(false);
      setLoadingMessage('');
      
      // Intentar reproducir automáticamente después de un breve delay
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play().catch(err => {
            console.error('Autoplay bloqueado:', err);
            // El usuario puede presionar play manualmente
          });
        }
      }, 300);
    } catch (err) {
      console.error('Error en speakText:', err);
      alert(t.speakError + ': ' + err.message);
      setLoading(false);
      setLoadingMessage('');
    }
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
        
        <div className="language-toggle">
          <span className={language === 'es-MX' ? 'active' : ''}>Español</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={language === 'en'}
              onChange={() => setLanguage(language === 'en' ? 'es-MX' : 'en')}
              aria-label="Cambiar idioma"
            />
            <span className="slider"></span>
          </label>
          <span className={language === 'en' ? 'active' : ''}>English</span>
        </div>

        <div 
          className={`camera-container ${capturing ? 'capturing' : ''}`}
          onClick={!capturedImage ? captureImage : null}
          style={{ cursor: !capturedImage && cameraReady ? 'pointer' : 'default' }}
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ display: capturedImage ? 'none' : 'block' }}
            aria-label="Vista de cámara - Toca para capturar"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {capturedImage && <img src={capturedImage} alt="Foto capturada" />}
          {capturing && <div className="flash-overlay"></div>}
          {!capturedImage && cameraReady && (
            <div className="tap-hint">
              <span>📸</span>
              <p>Toca para capturar</p>
            </div>
          )}
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

        {extractedText && (
          <div className="text-result">
            {loading && !audioUrl && (
              <div className="audio-loading">
                <span className="spinner"></span>
                <span>{loadingMessage}</span>
              </div>
            )}
            
            {audioUrl && (
              <div className="audio-controls-top">
                <audio 
                  ref={audioRef} 
                  controls 
                  controlsList="nodownload"
                  className="audio-player-large"
                  aria-label="Reproductor de audio"
                  preload="auto"
                  src={audioUrl}
                />
              </div>
            )}

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
