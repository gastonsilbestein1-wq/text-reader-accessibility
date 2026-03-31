import json
import boto3
import os
from datetime import datetime
from io import BytesIO

import re

polly = boto3.client('polly')
s3 = boto3.client('s3')

# Mapeo de idiomas a voces de Polly
VOICE_MAP = {
    'en': {'VoiceId': 'Joanna', 'LanguageCode': 'en-US'},
    'es-MX': {'VoiceId': 'Mia', 'LanguageCode': 'es-MX'}
}

# Límite de caracteres de Polly (dejamos margen de seguridad)
MAX_CHARS = 2900

def clean_for_speech(text):
    """
    Convierte texto estructurado (tablas, facturas) a texto natural para Polly.
    Elimina caracteres de formato que suenan raro al leerlos.
    """
    # Reemplazar separadores de tabla " | " por pausa natural
    text = re.sub(r'\s*\|\s*', ', ', text)
    # Eliminar líneas que son solo guiones o iguales (separadores de tabla)
    text = re.sub(r'^[-=_]{3,}\s*$', '', text, flags=re.MULTILINE)
    # Reemplazar múltiples espacios/tabs (alineación de columnas) por un espacio
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # Reemplazar "..." usado para alinear precios por pausa
    text = re.sub(r'\.{3,}', ', ', text)
    # Limpiar líneas vacías múltiples
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def split_text(text, max_length=MAX_CHARS):
    """
    Divide el texto en fragmentos respetando límites de oraciones
    """
    if len(text) <= max_length:
        return [text]
    
    chunks = []
    current_chunk = ""
    
    # Dividir por párrafos primero
    paragraphs = text.split('\n')
    
    for paragraph in paragraphs:
        # Si el párrafo es muy largo, dividir por oraciones
        if len(paragraph) > max_length:
            sentences = paragraph.replace('!', '.').replace('?', '.').split('.')
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                    
                # Si agregar esta oración excede el límite, guardar chunk actual
                if len(current_chunk) + len(sentence) + 2 > max_length:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    current_chunk = sentence + '. '
                else:
                    current_chunk += sentence + '. '
        else:
            # Si agregar este párrafo excede el límite, guardar chunk actual
            if len(current_chunk) + len(paragraph) + 2 > max_length:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = paragraph + '\n'
            else:
                current_chunk += paragraph + '\n'
    
    # Agregar el último chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def synthesize_chunks(text_chunks, voice_config):
    """
    Sintetiza múltiples fragmentos de texto y los combina
    """
    audio_segments = []
    
    for i, chunk in enumerate(text_chunks):
        print(f"Sintetizando fragmento {i+1}/{len(text_chunks)}: {len(chunk)} caracteres")
        
        response = polly.synthesize_speech(
            Text=chunk,
            OutputFormat='mp3',
            VoiceId=voice_config['VoiceId'],
            LanguageCode=voice_config['LanguageCode'],
            Engine='neural'
        )
        
        audio_segments.append(response['AudioStream'].read())
    
    # Combinar todos los segmentos de audio
    combined_audio = b''.join(audio_segments)
    return combined_audio

def handler(event, context):
    try:
        body = json.loads(event['body'])
        text = body['text']
        language = body.get('language', 'en')
        
        print(f"Procesando texto de {len(text)} caracteres")
        
        # Limpiar formato estructurado para lectura natural
        text = clean_for_speech(text)
        
        # Seleccionar voz según idioma
        voice_config = VOICE_MAP.get(language, VOICE_MAP['en'])
        
        # Dividir texto si es necesario
        text_chunks = split_text(text)
        print(f"Texto dividido en {len(text_chunks)} fragmentos")
        
        # Sintetizar todos los fragmentos
        combined_audio = synthesize_chunks(text_chunks, voice_config)
        
        # Guardar audio combinado en S3
        bucket_name = os.environ['BUCKET_NAME']
        audio_key = f"audio/{datetime.now().timestamp()}.mp3"
        
        s3.put_object(
            Bucket=bucket_name,
            Key=audio_key,
            Body=combined_audio,
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
                'success': True,
                'chunks': len(text_chunks),
                'totalChars': len(text)
            })
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
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
