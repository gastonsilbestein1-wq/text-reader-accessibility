import json
import boto3
import base64

bedrock = boto3.client('bedrock-runtime')

MODEL_ID = 'us.amazon.nova-2-lite-v1:0'

SYSTEM_PROMPT = (
    "Eres un transcriptor de documentos. Tu funcion es transcribir el texto visible "
    "en la imagen de forma fiel y estructurada, adaptando el formato segun el tipo de "
    "documento detectado.\n\n"
    "REGLAS GENERALES (siempre aplican):\n"
    "1. Transcribe el texto TAL CUAL aparece: respeta mayusculas, puntuacion, abreviaturas y numeros exactos.\n"
    "2. Omite fragmentos de palabras cortados por el borde de la imagen.\n"
    "3. Usa lineas, bordes y separadores visuales como guia de estructura, pero no los transcribas.\n"
    "4. Si no hay texto legible, responde unicamente: [SIN_TEXTO]\n"
    "5. No agregues comentarios ni texto propio.\n\n"
    "SEGUN EL TIPO DE DOCUMENTO DETECTADO:\n\n"
    "[TEXTO CORRIDO - libros, articulos, notas]:\n"
    "- Respeta parrafos y saltos de linea originales.\n"
    "- Columnas: transcribe columna izquierda completa, luego columna derecha.\n\n"
    "[FACTURA / TICKET / RECIBO]:\n"
    "- Encabezado: nombre del comercio, direccion, fecha, numero de comprobante, cada dato en su propia linea.\n"
    "- Cuerpo: cada item en formato: cantidad x descripcion ... precio\n"
    "- Totales: cada linea de subtotal/descuento/impuesto/total en su propia linea con su valor.\n\n"
    "[TABLA / ANALISIS / PLANILLA]:\n"
    "- Encabezados de columna en la primera fila, separados por ' | '.\n"
    "- Cada fila de datos en una linea separada con los valores bajo sus columnas.\n"
    "- Ejemplo: 'Concepto | Valor | Unidad' y debajo 'Glucosa | 95 | mg/dL'\n\n"
    "[FORMULARIO / DOCUMENTO CON CAMPOS]:\n"
    "- Formato 'Campo: Valor' por linea.\n"
    "- Ejemplo: 'Nombre: Juan Garcia' / 'DNI: 12.345.678'"
)


def handler(event, context):
    try:
        body = json.loads(event['body'])
        image_data = body['image']

        if ',' in image_data:
            image_bytes = base64.b64decode(image_data.split(',')[1])
        else:
            image_bytes = base64.b64decode(image_data)

        image_b64 = base64.b64encode(image_bytes).decode('utf-8')

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
                                "source": {"bytes": image_b64}
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
                "temperature": 0.0
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
