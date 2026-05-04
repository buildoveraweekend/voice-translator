import { useState, useRef, useCallback, useEffect } from 'react';  // ← useEffect added
import './App.css';
import config from './config';


const STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

export default function App() {
  // TODO: Set up state variables
  // Hint: targetLang, status, result, errorMsg, audioData
  // Hint: useState('') for targetLang so no language pre-selected

  // TODO: Set up refs
  // Hint: mediaRecorderRef, audioChunksRef, audioRef, targetLangRef
  // Hint: useRef for things callbacks need to read without stale closure

  // TODO: Add useEffect to play audio when audioData changes
  // Hint: set audioRef.current.src as data URI, call load() then play()
  // Hint: add a 300ms setTimeout before play() to let load() complete
  
  // TODO: Implement handleLangChange
  // Hint: update BOTH setTargetLang (for UI) AND targetLangRef.current (for callbacks)

  // TODO: Implement blobToBase64 helper
  // Hint: use FileReader, resolve with result.split(',')[1]
  // Must be declared BEFORE sendToAPI

    // TODO: Implement sendToAPI(audioBlob, lang)
  // Hint: blobToBase64 → fetch → setResult → setAudioData
  // Hint: lang comes as a parameter — do not read from state (stale closure!)
  // Must be declared BEFORE startRecording
  // 
  
  // TODO: Implement startRecording
  // Steps:
  //   1. Guard: return early if !targetLangRef.current
  //   2. Reset state: result, errorMsg, audioData, audioChunks
  //   3. getUserMedia({ audio: true })
  //   4. Create MediaRecorder with config.AUDIO_MIME_TYPE
  //   5. ondataavailable: push to audioChunksRef.current
  //   6. onstop: create Blob, call sendToAPI(blob, targetLangRef.current)
  //   7. mediaRecorder.start(config.AUDIO_CHUNK_INTERVAL_MS)
  // Dependency array: [sendToAPI]

  
  // TODO: Implement stopRecording
  // Hint: check status === STATUS.RECORDING before stopping
  // Dependency array: [status]


    return (
    <div className="app">
      <header>
        <h1>Voice Translator</h1>
        <p>Speak in any language. Hear the translation instantly.</p>
      </header>

      <main>
        {/* TODO: Language selector dropdown */}
        {/* Hint: use config.LANGUAGES to map options */}
        {/* Hint: red border when no language selected */}
        {/* Hint: disabled during RECORDING and PROCESSING */}

        {/* TODO: Audio element — always in DOM, never conditionally rendered */}
        {/* Hint: use display style to show/hide, not conditional rendering */}

        {/* TODO: Record / Stop button */}
        {/* Hint: disabled when !targetLang or status === PROCESSING */}
        {/* Hint: show "Select a language first" when no language chosen */}

        {/* TODO: Recording indicator (pulsing dot) */}
        {/* Hint: only show when status === RECORDING */}

        {/* TODO: Processing indicator with spinner */}
        {/* Hint: only show when status === PROCESSING */}

        {/* TODO: Results section */}
        {/* Hint: only show when status === DONE && result exists */}
        {/* Show: detected language, source text, translated text */}

        {/* TODO: Error section */}
        {/* Hint: only show when status === ERROR */}
        {/* Include a "Try Again" button that resets status to IDLE */}
      </main>

      <footer>
        <p>Powered by AWS Transcribe + Translate + Polly</p>
      </footer>
    </div>
  );
}