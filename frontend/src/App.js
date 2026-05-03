import { useState, useRef, useCallback, useEffect } from 'react';  // ← useEffect added
import './App.css';
import config from './config';

/* const API_URL = process.env.REACT_APP_API_URL;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
];*/

const STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

export default function App() {
  const [targetLang, setTargetLang] = useState('');
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [audioData, setAudioData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const targetLangRef = useRef('');

  // ── Plays audio whenever audioData changes ─────────────────────────────
  useEffect(() => {
    if (audioData && audioRef.current) {
      console.log('Attempting to play audio, length:', audioData.length);
      audioRef.current.src = `data:audio/mp3;base64,${audioData}`;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => console.log('Playing!'))
        .catch(err => console.error('Play failed:', err.message));
    }
  }, [audioData]);

  const handleLangChange = (e) => {
    setTargetLang(e.target.value);
    targetLangRef.current = e.target.value;
  };

  const startRecording = useCallback(async () => {
    if (!targetLangRef.current) {
      setErrorMsg('Please select a language before recording');
      return;
    }

    setResult(null);
    setErrorMsg('');
    setAudioData(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendToAPI(audioBlob, targetLangRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setStatus(STATUS.RECORDING);
    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone access in your browser.');
      setStatus(STATUS.ERROR);
    }
  }, [sendToAPI]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === STATUS.RECORDING) {
      mediaRecorderRef.current.stop();
      setStatus(STATUS.PROCESSING);
    }
  }, [status]);

  const sendToAPI = useCallback(async (audioBlob, lang) => {
    try {
      const base64Audio = await blobToBase64(audioBlob);
      console.log(`Sending ${audioBlob.size} bytes, lang: ${lang}`);

      const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio, targetLang: lang }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Translation failed');

      console.log('Audio data length:', data.audio?.length);
      setResult(data);
      setStatus(STATUS.DONE);
      setAudioData(data.audio);  // ← this triggers the useEffect to play
    } catch (err) {
      console.error('API error:', err);
      setErrorMsg(err.message || 'Something went wrong. Check the console.');
      setStatus(STATUS.ERROR);
    }
  }, []);

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return (
    <div className="app">
      <header>
        <h1>Voice Translator</h1>
        <p>Speak in any language. Hear the translation instantly.</p>
      </header>

      <main>
        <div className="language-selector">
          <label>Translate to:</label>
          <select
            value={targetLang}
            onChange={handleLangChange}
            style={{ borderColor: !targetLang ? '#e53e3e' : undefined }}
            disabled={status === STATUS.RECORDING || status === STATUS.PROCESSING}
          >
            <option value="" disabled>— choose a language —</option>
            {config.LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>

        {/* Audio element always in DOM so ref is never null */}
        <audio ref={audioRef} controls style={{ width: '100%', marginTop: '12px', display: status === STATUS.DONE ? 'block' : 'none' }} />

        <div className="record-section">
          {status !== STATUS.RECORDING ? (
            <button
              className="btn-record"
              onClick={startRecording}
              disabled={status === STATUS.PROCESSING || !targetLang}
            >
              {status === STATUS.PROCESSING ? 'Translating...' : !targetLang ? 'Select a language first' : '🎤 Hold to Record'}
            </button>
          ) : (
            <button className="btn-stop" onClick={stopRecording}>
              ⏹ Stop Recording
            </button>
          )}

          {status === STATUS.RECORDING && (
            <div className="recording-indicator">
              <span className="dot"></span> Recording... speak now
            </div>
          )}

          {status === STATUS.PROCESSING && (
            <div className="processing">
              <div className="spinner"></div>
              <p>Transcribing → Translating → Generating speech...</p>
              <small>This takes about 20-30 seconds</small>
            </div>
          )}
        </div>

        {status === STATUS.DONE && result && (
          <div className="result">
            <div className="result-box">
              <h3>You said ({result.detectedLanguage}):</h3>
              <p className="text">{result.sourceText}</p>
            </div>
            <div className="arrow">↓ Translated to {config.LANGUAGES.find(l => l.code === targetLang)?.label} ↓</div>
            <div className="result-box translated">
              <h3>Translation:</h3>
              <p className="text">{result.translatedText}</p>
            </div>
          </div>
        )}

        {status === STATUS.ERROR && (
          <div className="error">
            <p>Error: {errorMsg}</p>
            <button onClick={() => setStatus(STATUS.IDLE)}>Try Again</button>
          </div>
        )}
      </main>

      <footer>
        <p>Powered by AWS Transcribe + Translate + Polly</p>
      </footer>
    </div>
  );
}