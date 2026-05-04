"""
Voice Translator Lambda Function
Build Over A Weekend — youtube.com/@BuildOverAWeekend

Pipeline: Audio → Transcribe (STT) → Translate → Polly (TTS) → Audio

STARTER CODE — follow along with the tutorial to complete the TODOs
"""

import json
import boto3
import base64
import uuid
import time
import os

# ─── AWS clients ──────────────────────────────────────────────────────────────
# TODO: Create boto3 clients for s3, transcribe, translate, and polly
# Hint: boto3.client('service-name', region_name=AWS_REGION)
AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', 'eu-west-2')
BUCKET_NAME = os.environ['BUCKET_NAME']


def lambda_handler(event, context):
    """Main entry point — called by API Gateway."""

    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return cors_response(200, {})

    try:
        # TODO: Parse the request body
        # Hint: json.loads(event.get('body') or '{}')
        body = {}
        audio_b64 = None
        target_lang = None

        # TODO: Validate that audio and targetLang are present
        # Return a 400 error if either is missing

        # TODO: Decode the base64 audio
        # Hint: base64.b64decode(audio_b64)

        # TODO: Generate a unique job ID
        # Hint: str(uuid.uuid4())

        # Step 1: TODO — Upload audio to S3

        # Step 2: TODO — Start Amazon Transcribe job
        # Remember to set IdentifyLanguage=True

        # Step 3: TODO — Poll until Transcribe job completes

        # Step 4: TODO — Fetch transcript from S3

        # Step 5: TODO — Call Amazon Translate

        # Step 6: TODO — Call Amazon Polly, get MP3

        # Step 7: TODO — Return results including base64 audio

        return cors_response(200, {'message': 'TODO — implement the pipeline!'})

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response(500, {'error': str(e)})


def cors_response(status_code, body):
    """
    Always include CORS headers — even on error responses.
    Without CORS headers on errors, the browser shows 'Failed to fetch'
    and hides the real error message. This is one of the most
    confusing bugs in web development.
    """
    # TODO: Return dict with statusCode, headers (CORS), and body
    # Hint: Access-Control-Allow-Origin must be '*'
    # Hint: Include Content-Type, Allow-Headers, Allow-Methods
    # CRITICAL: This must be called for EVERY response including errors
    pass
