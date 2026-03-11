import json
import boto3
import base64
import os
from datetime import datetime

textract = boto3.client('textract')
s3 = boto3.client('s3')

def handler(event, context):
    try:
        body = json.loads(event['body'])
        image_data = body['image']
        
        # Decodificar imagen base64
        image_bytes = base64.b64decode(image_data.split(',')[1])
        
        # Extraer texto con Textract
        response = textract.detect_document_text(
            Document={'Bytes': image_bytes}
        )
        
        # Extraer texto de la respuesta
        text_lines = []
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                text_lines.append(block['Text'])
        
        extracted_text = '\n'.join(text_lines)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'text': extracted_text,
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
