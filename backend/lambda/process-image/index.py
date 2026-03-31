import json
import boto3
import base64
import os

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Model ID para Nova Lite 2
MODEL_ID = 'us.amazon.nova-2-lite-v1:0'

# System prompt conciso: define el rol y las reglas de transcripción
SYSTEM_PROMPT = """Eres un transcriptor de texto de imágenes. Tu única función es transcribir exactamente el texto visible en la imagen, sin interpretar, resumir, traducir ni agregar nada.

REGLAS:
1. Transcribe el texto TAL CUAL aparece, respetando mayúsculas, puntuación, abreviaturas y números exactos.
2. Si el documento tiene columnas, transcribe la columna izquierda completa de arriba a abajo, luego la columna derecha completa de arriba a abajo.
3. Omite completamente cualquier fragmento de palabra incompleto que aparezca en los bordes de la imagen (palabras cortadas por el encuadre).
4. Usa elementos visuales (líneas, bordes, separadores, recuadros) como guía para identificar bloques de texto independientes y su orden de lectura, pero NO los transcribas como caracteres.
5. Preserva los saltos de línea y párrafos del documento original.
6. No interpretes abreviaturas (escribe "Bs.As." no "Buenos Aires").
7. No reformatees precios, fechas ni cantidades.
8. Si no hay texto legible en la imagen, responde únicamente: [SIN_TEXTO]
9. No agregues comentarios, explicaciones ni texto propio. Solo el texto transcrito."""

def handler(event, context):
    try:
        body = json.loads(event['body'])
        image_data = body['image']

        # Decodificar imagen base64 (quitar el prefijo data:image/...;base64,)
        if ',' in image_data:
            image_bytes = base64.b64decode(image_data.split(',')[1])
        else:
            image_bytes = base64.b64decode(image_data)

        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        # Construir el request para Nova Lite 2
        request_body = {
            "schemaVersion": "messages-v1",
            "system": [{"text": SYSTEM_PROMPT}],
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "image": {
                                "format": "jpeg",
                                "source": {
                                    "bytes": image_b64
                                }
                            }
                        },
                        {
                            "text": "Transcribe el texto de esta imagen."
                        }
                    ]
                }
            ],
            "inferenceConfig": {
                "maxTokens": 4096,
                "temperature": 0.0  # Temperatura 0 para máxima fidelidad/determinismo
            }
        }

        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=json.dumps(request_body),
            contentType='application/json',
            accept='application/json'
        )

        result = json.loads(response['body'].read())
        extracted_text = result['output']['message']['content'][0]['text'].strip()

        # Si el modelo indica que no hay texto legible
        if extracted_text == '[SIN_TEXTO]' or len(extracted_text) < 3:
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'text': '', 'success': True})
            }

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'text': extracted_text, 'success': True})
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e), 'success': False})
        }
