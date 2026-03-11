#!/usr/bin/env python3
"""
Servidor local para desarrollo - requiere credenciales AWS configuradas
Usa los servicios reales de AWS (Textract y Polly) pero corre localmente
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import base64
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Clientes AWS (usa credenciales locales)
textract = boto3.client('textract')
polly = boto3.client('polly')
s3 = boto3.client('s3')

# Configuración
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'text-reader-dev-bucket')

# Mapeo de voces
VOICE_MAP = {
    'en': {'VoiceId': 'Joanna', 'LanguageCode': 'en-US'},
    'es': {'VoiceId': 'Lucia', 'LanguageCode': 'es-ES'},
    'es-MX': {'VoiceId': 'Mia', 'LanguageCode': 'es-MX'}
}

@app.route('/process', methods=['POST', 'OPTIONS'])
def process_image():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        image_data = data['image']
        
        # Decodificar imagen base64
        image_bytes = base64.b64decode(image_data.split(',')[1])
        
        # Extraer texto con Textract
        response = textract.detect_document_text(
            Document={'Bytes': image_bytes}
        )
        
        # Extraer líneas de texto
        text_lines = []
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                text_lines.append(block['Text'])
        
        extracted_text = '\n'.join(text_lines)
        
        return jsonify({
            'text': extracted_text,
            'success': True
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/speak', methods=['POST', 'OPTIONS'])
def text_to_speech():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        text = data['text']
        language = data.get('language', 'en')
        
        # Seleccionar voz
        voice_config = VOICE_MAP.get(language, VOICE_MAP['en'])
        
        # Sintetizar con Polly
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=voice_config['VoiceId'],
            LanguageCode=voice_config['LanguageCode'],
            Engine='neural'
        )
        
        # Guardar temporalmente
        audio_filename = f"audio_{datetime.now().timestamp()}.mp3"
        audio_path = f"/tmp/{audio_filename}"
        
        with open(audio_path, 'wb') as f:
            f.write(response['AudioStream'].read())
        
        # En desarrollo, servir desde /tmp
        audio_url = f"http://localhost:5000/audio/{audio_filename}"
        
        return jsonify({
            'audioUrl': audio_url,
            'success': True
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    from flask import send_file
    return send_file(f"/tmp/{filename}", mimetype='audio/mpeg')

if __name__ == '__main__':
    print("🚀 Servidor local corriendo en http://localhost:5000")
    print("⚠️  Requiere credenciales AWS configuradas (aws configure)")
    print("💡 Usa servicios reales de AWS: Textract y Polly")
    app.run(debug=True, port=5000)
