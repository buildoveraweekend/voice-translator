"""
Voice Translator Lambda Function
Pipeline: Audio → Transcribe (STT) → Translate → Polly (TTS) → Audio
"""

import json
import boto3
import base64
import uuid
import time
import os
import urllib.request

# ─── AWS clients ──────────────────────────────────────────────────────────────
s3 = boto3.client('s3', region_name='eu-west-2')
transcribe = boto3.client('transcribe', region_name='eu-west-2')
translate_client = boto3.client('translate', region_name='eu-west-2')
polly = boto3.client('polly', region_name='eu-west-2')

# ─── Configuration ────────────────────────────────────────────────────────────
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'voice-translator-YOUR-NAME-2026')

# Map from Transcribe language codes → Translate language codes
TRANSCRIBE_TO_TRANSLATE = {
    'en-US': 'en', 'en-GB': 'en', 'es-ES': 'es', 'es-US': 'es',
    'fr-FR': 'fr', 'de-DE': 'de', 'it-IT': 'it', 'pt-BR': 'pt',
    'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh', 'hi-IN': 'hi',
    'ar-SA': 'ar', 'ru-RU': 'ru', 'nl-NL': 'nl', 'tr-TR': 'tr',
}

# Map from Translate language code → Polly voice settings
# Format: (VoiceId, LanguageCode)
TRANSLATE_TO_POLLY = {
    'en': ('Joanna', 'en-US'),
    'es': ('Lucia', 'es-ES'),
    'fr': ('Celine', 'fr-FR'),
    'de': ('Marlene', 'de-DE'),
    'it': ('Carla', 'it-IT'),
    'pt': ('Ines', 'pt-PT'),
    'ja': ('Mizuki', 'ja-JP'),
    'ko': ('Seoyeon', 'ko-KR'),
    'zh': ('Zhiyu', 'cmn-CN'),
    'hi': ('Aditi', 'hi-IN'),
    'ar': ('Zeina', 'arb'),
    'ru': ('Tatyana', 'ru-RU'),
    'nl': ('Lotte', 'nl-NL'),
    'tr': ('Filiz', 'tr-TR'),
}


def lambda_handler(event, context):
    """
    Main entry point for the Lambda function.
    Expects a POST body with:
      - audio: base64-encoded audio data (webm or mp4)
      - targetLang: e.g. 'es', 'fr', 'de'
    Returns JSON with:
      - sourceText: what was said
      - translatedText: what it means in target language
      - detectedLanguage: what language was detected
      - audio: base64-encoded MP3 of translated speech
    """
    print(f"Event received: {json.dumps(event)[:200]}")  # Logs to CloudWatch

    # ── CORS preflight (OPTIONS request from browser) ──────────────────────
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})

    try:
        # ── 1. Parse the incoming request ──────────────────────────────────
        body = json.loads(event.get('body', '{}'))
        audio_b64 = body.get('audio')
        target_lang = body.get('targetLang')

        # Validate audio
        if not audio_b64:
            return cors_response(400, {'error': 'Missing required field: audio'})

        # Validate targetLang — must be present and a language we support
        SUPPORTED_LANGS = set(TRANSLATE_TO_POLLY.keys())  # {'en','es','fr','de', ...}
        if not target_lang:
             return cors_response(400, {'error': 'Missing required field: targetLang'})
        if target_lang not in SUPPORTED_LANGS:
            return cors_response(400, {
                'error': f'Unsupported targetLang: "{target_lang}". Supported: {sorted(SUPPORTED_LANGS)}'
        })

        if not audio_b64:
            return cors_response(400, {'error': 'No audio data provided'})

        audio_bytes = base64.b64decode(audio_b64)
        job_id = str(uuid.uuid4())
        print(f"Processing job: {job_id}, target: {target_lang}")

        # ── 2. Upload audio to S3 ──────────────────────────────────────────
        s3_key = f'input/{job_id}.webm'
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=audio_bytes,
            ContentType='audio/webm'
        )
        print(f"Audio uploaded to s3://{BUCKET_NAME}/{s3_key}")

        # ── 3. Start Amazon Transcribe job ─────────────────────────────────
        job_name = f'translate-{job_id}'
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={
                'MediaFileUri': f's3://{BUCKET_NAME}/{s3_key}'
            },
            MediaFormat='webm',
            IdentifyLanguage=True,          # Auto-detect language!
            OutputBucketName=BUCKET_NAME,
            OutputKey=f'transcripts/{job_id}.json',
        )
        print(f"Transcription job started: {job_name}")

        # ── 4. Poll until Transcribe job is done ───────────────────────────
        max_wait_seconds = 55  # Lambda has a 60s timeout by default
        start_time = time.time()

        while True:
            response = transcribe.get_transcription_job(
                TranscriptionJobName=job_name
            )
            job = response['TranscriptionJob']
            status = job['TranscriptionJobStatus']
            print(f"Transcribe status: {status}")

            if status == 'COMPLETED':
                break
            elif status == 'FAILED':
                reason = job.get('FailureReason', 'Unknown error')
                return cors_response(500, {'error': f'Transcription failed: {reason}'})

            elapsed = time.time() - start_time
            if elapsed > max_wait_seconds:
                return cors_response(504, {'error': 'Transcription timed out'})

            time.sleep(2)

        # ── 5. Fetch the transcript from S3 ───────────────────────────────
        transcript_obj = s3.get_object(
            Bucket=BUCKET_NAME,
            Key=f'transcripts/{job_id}.json'
        )
        transcript_data = json.loads(transcript_obj['Body'].read())
        source_text = transcript_data['results']['transcripts'][0]['transcript']

        # Get the detected language code (e.g. 'en-US')
        detected_lang_code = job.get('LanguageCode', 'en-US')
        source_lang = TRANSCRIBE_TO_TRANSLATE.get(detected_lang_code, 'en')
        print(f"Detected language: {detected_lang_code} → {source_lang}")
        print(f"Transcript: {source_text}")

        if not source_text.strip():
            return cors_response(400, {'error': 'No speech detected in audio'})

        # ── 6. Translate the text ──────────────────────────────────────────
        if source_lang == target_lang:
            # Same language — no translation needed
            translated_text = source_text
        else:
            translate_response = translate_client.translate_text(
                Text=source_text,
                SourceLanguageCode=source_lang,
                TargetLanguageCode=target_lang,
            )
            translated_text = translate_response['TranslatedText']

        print(f"Translated ({source_lang}→{target_lang}): {translated_text}")

        # ── 7. Convert translated text to speech with Polly ────────────────
        voice_id, lang_code = TRANSLATE_TO_POLLY.get(
            target_lang, ('Joanna', 'en-US')
        )
        polly_response = polly.synthesize_speech(
            Text=translated_text,
            OutputFormat='mp3',
            VoiceId=voice_id,
            LanguageCode=lang_code,
        )
        audio_content = polly_response['AudioStream'].read()
        audio_b64_out = base64.b64encode(audio_content).decode('utf-8')
        print(f"Polly generated {len(audio_content)} bytes of audio")

        # ── 8. Return everything to the frontend ───────────────────────────
        return cors_response(200, {
            'sourceText': source_text,
            'translatedText': translated_text,
            'detectedLanguage': detected_lang_code,
            'targetLanguage': target_lang,
            'audio': audio_b64_out,
        })

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {'error': str(e)})


def cors_response(status_code, body):
    """Helper to always include CORS headers so the browser doesn't block us."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',          # In production: your domain
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
        },
        'body': json.dumps(body),
    }