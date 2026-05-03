// frontend/src/App.js
// STARTER CODE — follow along with Part 3 of the tutorial
// Part 3 walkthrough: https://youtu.be/PART3-LINK

import { useState, useRef, useCallback, useEffect } from 'react';
import config from './config';
import './App.css';

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

  // TODO: Set up refs
  // Hint: mediaRecorderRef, audioChunksRef, audioRef, targetLangRef

  // TODO: Add useEffect to play audio when audioData changes

  // TODO: Implement handleLangChange
  // Remember to update both state AND the ref

  // TODO: Implement startRecording
  // Steps: guard check → getUserMedia → MediaRecorder setup → start

  // TODO: Implement stopRecording

  // TODO: Implement sendToAPI(audioBlob, lang)
  // Steps: blobToBase64 → fetch → setResult → setAudioData

  // TODO: Implement blobToBase64 helper

  return (
    <div className="app">
      <header>
        <h1>Voice Translator</h1>
        <p>Speak in any language. Hear the translation instantly.</p>
      </header>

      <main>
        {/* TODO: Language selector dropdown */}

        {/* TODO: Audio element (always in DOM) */}

        {/* TODO: Record / Stop button */}

        {/* TODO: Processing indicator */}

        {/* TODO: Results section */}

        {/* TODO: Error section */}
      </main>

      <footer>
        <p>Powered by AWS Transcribe + Translate + Polly</p>
      </footer>
    </div>
  );
}
