import json
import boto3
import os
from datetime import datetime

polly = boto3.client('polly')
s3 = boto3.client('s3')

# Mapeo de idiomas a voces de Polly
VOICE_MAP = {
    'en': {'VoiceId': 'Joanna', 'LanguageCode': 'en-US'},
    'es-MX': {'VoiceId': 'Mia', 'LanguageCode': 'es-MX'}
}

def handler(event, context):
    try:
        body = json.loads(event['body'])
        text = body['text']
        language = body.get('language', 'en')
        
        # Seleccionar voz según idioma
        voice_config = VOICE_MAP.get(language, VOICE_MAP['en'])
        
        # Sintetizar voz con Polly
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_config['VoiceId'],
            LanguageCode=voice_config['LanguageCode'],
            Engine='neural'
        )
        
        # Guardar audio en S3
        bucket_name = os.environ['BUCKET_NAME']
        audio_key = f"audio/{datetime.now().timestamp()}.mp3"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=audio_key,
            Body=response['AudioStream'].read(),
            ContentType='audio/mpeg'
        )
        
        # Generar URL presignada
        audio_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': audio_key},
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'audioUrl': audio_url,
                'success': True
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e),
                'success': False
            })
        }
