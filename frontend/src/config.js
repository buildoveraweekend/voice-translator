// frontend/src/config.js
// ─────────────────────────────────────────────────────────
// Central config file — only place you need to change the
// API URL. Set REACT_APP_API_URL in your .env file.
// ─────────────────────────────────────────────────────────

const config = {
  // API Gateway endpoint — set in .env file
  // Never hardcode this value here
  API_URL: process.env.REACT_APP_API_URL,

  // Supported languages for the dropdown
  LANGUAGES: [
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
  ],

  // Recording settings
  AUDIO_MIME_TYPE: 'audio/webm;codecs=opus',
  AUDIO_CHUNK_INTERVAL_MS: 100,
};

export default config;  