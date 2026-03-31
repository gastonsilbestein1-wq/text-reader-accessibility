import json
import boto3
import base64
import os

bedrock = boto3.client('bedrock-runtime')

# Model ID para Nova Lite 2
MODEL_ID = 'us.amazon.nova-2-lite-v1:0'

# System prompt conciso: define el rol y las reglas de transcripción
SYSTEM_PROMPT = """Eres un transcriptor de documentos. Tu función es transcribir el texto visible en la imagen de forma fiel y estructurada, adaptando el formato según el tipo de documento detectado.

REGLAS GENERALES (siempre aplican):
1. Transcribe el texto TAL CUAL aparece: respeta mayúsculas, puntuación, abreviaturas y números exactos.
2. Omite fragmentos de palabras cortados por el borde de la imagen.
3. Usa líneas, bordes y separadores visuales como guía de estructura, pero no los transcribas.
4. Si no hay texto legible, responde únicamente: [SIN_TEXTO]
5. No agregues comentarios ni texto propio.

SEGÚN EL TIPO DE DOCUMENTO DETECTADO:

[TEXTO CORRIDO - libros, artículos, notas]:
- Respeta párrafos y saltos de línea originales.
- Columnas: transcribe columna izquierda completa, luego columna derecha.

[FACTURA / TICKET / RECIBO]:
- Encabezado: nombre del comercio, dirección, fecha, número de comprobante — cada dato en su propia línea.
- Cuerpo: cada ítem en formato "cantidad x descripción ... precio"
- Totales: cada línea de subtotal/descuento/impuesto/total en su propia línea con su valor.
- Ejemplo de ítem: "2 x Leche entera 1L ... $850,00"

[TABLA / ANÁLISIS / PLANILLA]:
- Reproduce la estructura de la tabla usando tabulaciones o espacios para alinear columnas.
- Encabezados de columna en la primera fila, separados por " | ".
- Cada fila de datos en una línea separada con los valores alineados bajo sus columnas.
- Ejemplo: "Concepto | Valor | Unidad"
            "Glucosa  | 95    | mg/dL"

[FORMULARIO / DOCUMENTO CON CAMPOS]:
- Formato "Campo: Valor" por línea.
- Ejemplo: "Nombre: Juan García"
           "DNI: 12.345.678"

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
