import { useEffect,useState, useRef, useCallback } from 'react';
import './App.css';


// ─── Configuration ──────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL;

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
];

// Status states for the app
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
  const [audioData, setAudioData] = useState(null);  // ← add this state

  // Refs for MediaRecorder and collected audio chunks
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const targetLangRef = useRef('');  

  useEffect(() => {
    if (audioData && audioRef.current) {
      console.log('Attempting to play audio...');
      audioRef.current.src = `data:audio/mp3;base64,${audioData}`;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => console.log('Playing!'))
        .catch(err => console.error('Play failed:', err.message));
    }
  }, [audioData]); 

  // Keep ref in sync whenever dropdown changes
    const handleLangChange = (e) => {
    setTargetLang(e.target.value);
    targetLangRef.current = e.target.value;  // ← always current
  };

  // ── Start recording from microphone ───────────────────────────────────────
  const startRecording = useCallback(async () => {
     // Guard — don't proceed if no language selected
     if (!targetLangRef.current) {
        setErrorMsg('Please select a language before recording');
        return;
      }
  
    setResult(null);
    setErrorMsg('');
    audioChunksRef.current = [];

    try {
      // Ask browser for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create a MediaRecorder — this captures audio from the mic
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio data as it comes in
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops, process the audio
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendToAPI(audioBlob, targetLangRef.current);
        // Stop the microphone stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setStatus(STATUS.RECORDING);
    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone access in your browser.');
      setStatus(STATUS.ERROR);
    }
  }, []);


  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === STATUS.RECORDING) {
      mediaRecorderRef.current.stop();
      setStatus(STATUS.PROCESSING);
    }
  }, [status]);

  // ── Send audio to API Gateway → Lambda ────────────────────────────────────
  const sendToAPI = useCallback(async (audioBlob, lang) => {
    try {
      // Convert audio blob to base64 string
      const base64Audio = await blobToBase64(audioBlob);
      
      console.log(`Sending ${audioBlob.size} bytes of audio to API...`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          targetLang: lang,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setResult(data);
      setStatus(STATUS.DONE);
      console.log('Audio data length:', data.audio?.length);
      console.log('Audio data start:', data.audio?.substring(0, 50));

       

      // Auto-play the translated audio
      if (data.audio) {
        playAudio(data.audio);
      }
    } catch (err) {
      console.error('API error:', err);
      setErrorMsg(err.message || 'Something went wrong. Check the console.');
      setStatus(STATUS.ERROR);
    }
  }, [targetLang]);

  /* // ── Play base64 MP3 audio ──────────────────────────────────────────────────
  const playAudio = (base64Audio) => {
    const audioData = atob(base64Audio);
    const arrayBuffer = new ArrayBuffer(audioData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      uint8Array[i] = audioData.charCodeAt(i);
    }
    const blob = new Blob([uint8Array], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };*/

  // ── Helper: convert Blob to base64 ────────────────────────────────────────
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is like "data:audio/webm;base64,XXXXX"
      // We only want the part after the comma
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header>
        <h1>Voice Translator</h1>
        <p>Speak in any language. Hear the translation instantly.</p>
      </header>

      <main>
        {/* Language Selector */}
        <div className="language-selector">
          <label>Translate to:</label>
          <select
            value={targetLang}
            onChange={handleLangChange}
            style={{ borderColor: !targetLang ? '#e53e3e' : undefined }}  // red border if empty
            disabled={status === STATUS.RECORDING || status === STATUS.PROCESSING}
          >
            <option value="" disabled>— choose a language —</option>  {/* ← placeholder */}
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>

        {/* Record Button */}
        <div className="record-section">
          {status !== STATUS.RECORDING ? (
            <button
              className="btn-record"
              onClick={startRecording}
              disabled={status === STATUS.PROCESSING || !targetLang}
            >
              {status === STATUS.PROCESSING ? 'Translating...' : '🎤 Hold to Record'}
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
              <small>This takes about 20-30 seconds (AWS AI services at work!)</small>
            </div>
          )}
        </div>

        {/* Results */}
        {status === STATUS.DONE && result && (
          <div className="result">
            <div className="result-box">
              <h3>You said ({result.detectedLanguage}):</h3>
              <p className="text">{result.sourceText}</p>
            </div>
            <div className="arrow">↓ Translated to {LANGUAGES.find(l => l.code === targetLang)?.label} ↓</div>
            <div className="result-box translated">
              <h3>Translation:</h3>
              <p className="text">{result.translatedText}</p>
            </div>
            <div className="audio-section">
              <audio ref={audioRef} controls className="audio-player" />
              <button className="btn-replay" onClick={() => audioRef.current?.play()}>
                ▶ Play Again
              </button>
            </div>
          </div>
        )}

        {/* Error */}
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