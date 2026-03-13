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
        
        # Usar AnalyzeDocument con LAYOUT para respetar formato y columnas
        response = textract.analyze_document(
            Document={'Bytes': image_bytes},
            FeatureTypes=['LAYOUT']
        )
        
        # Organizar bloques por orden de lectura respetando layout
        blocks = response['Blocks']
        
        # Separar bloques por tipo
        layout_blocks = [b for b in blocks if b['BlockType'] == 'LAYOUT_TEXT']
        line_blocks = [b for b in blocks if b['BlockType'] == 'LINE']
        
        # Si hay información de layout, usarla para ordenar correctamente
        if layout_blocks:
            text_lines = extract_text_with_layout(blocks)
        else:
            # Fallback: ordenar por posición vertical y horizontal
            text_lines = extract_text_by_position(line_blocks)
        
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
        print(f"Error processing image: {str(e)}")
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

def extract_text_with_layout(blocks):
    """
    Extrae texto respetando el layout y orden de lectura
    """
    # Crear mapeo de IDs a bloques
    block_map = {block['Id']: block for block in blocks}
    
    # Obtener bloques de layout ordenados por ReadingOrder
    layout_blocks = [b for b in blocks if b['BlockType'] == 'LAYOUT_TEXT']
    
    if not layout_blocks:
        # Si no hay bloques de layout, usar método alternativo
        line_blocks = [b for b in blocks if b['BlockType'] == 'LINE']
        return extract_text_by_position(line_blocks)
    
    # Ordenar por ReadingOrder si existe, sino por posición
    layout_blocks.sort(key=lambda x: (
        x.get('ReadingOrder', 999),
        x['Geometry']['BoundingBox']['Top'],
        x['Geometry']['BoundingBox']['Left']
    ))
    
    text_lines = []
    
    for layout_block in layout_blocks:
        section_lines = []
        
        # Obtener todos los bloques LINE que pertenecen a este layout
        if 'Relationships' in layout_block:
            for relationship in layout_block['Relationships']:
                if relationship['Type'] == 'CHILD':
                    for child_id in relationship['Ids']:
                        if child_id in block_map:
                            child_block = block_map[child_id]
                            if child_block['BlockType'] == 'LINE':
                                section_lines.append({
                                    'text': child_block.get('Text', ''),
                                    'top': child_block['Geometry']['BoundingBox']['Top'],
                                    'left': child_block['Geometry']['BoundingBox']['Left']
                                })
        
        # Ordenar líneas dentro del layout por posición (top, luego left)
        section_lines.sort(key=lambda x: (x['top'], x['left']))
        
        # Agregar líneas de esta sección
        for line in section_lines:
            if line['text'].strip():
                text_lines.append(line['text'])
        
        # Agregar separación entre secciones si hay contenido
        if section_lines and text_lines:
            text_lines.append('')
    
    # Limpiar líneas vacías múltiples al final
    while text_lines and not text_lines[-1].strip():
        text_lines.pop()
    
    return text_lines

def extract_text_by_position(line_blocks):
    """
    Fallback: Extrae texto ordenando por posición (top-to-bottom, left-to-right)
    Detecta columnas automáticamente
    """
    if not line_blocks:
        return []
    
    # Ordenar bloques por posición vertical primero
    sorted_blocks = sorted(line_blocks, key=lambda x: x['Geometry']['BoundingBox']['Top'])
    
    # Detectar columnas basándose en posición horizontal
    columns = detect_columns(sorted_blocks)
    
    text_lines = []
    current_row_top = -1
    row_tolerance = 0.02  # 2% de tolerancia para considerar misma fila
    
    # Agrupar bloques por filas
    rows = []
    current_row = []
    
    for block in sorted_blocks:
        top = block['Geometry']['BoundingBox']['Top']
        
        if current_row_top < 0:
            current_row_top = top
            current_row.append(block)
        elif abs(top - current_row_top) < row_tolerance:
            # Misma fila
            current_row.append(block)
        else:
            # Nueva fila
            if current_row:
                rows.append(current_row)
            current_row = [block]
            current_row_top = top
    
    if current_row:
        rows.append(current_row)
    
    # Procesar cada fila ordenando por posición horizontal
    for row in rows:
        row.sort(key=lambda x: x['Geometry']['BoundingBox']['Left'])
        row_text = ' '.join([block.get('Text', '') for block in row])
        if row_text.strip():
            text_lines.append(row_text)
    
    return text_lines

def detect_columns(blocks):
    """
    Detecta si el texto está organizado en columnas
    """
    if len(blocks) < 5:
        return 1
    
    # Analizar distribución horizontal
    left_positions = [b['Geometry']['BoundingBox']['Left'] for b in blocks]
    
    # Agrupar posiciones similares
    from collections import Counter
    position_groups = Counter()
    tolerance = 0.1
    
    for pos in left_positions:
        # Redondear a décimas para agrupar
        rounded = round(pos / tolerance) * tolerance
        position_groups[rounded] += 1
    
    # Si hay 2+ grupos significativos, probablemente hay columnas
    significant_groups = [count for count in position_groups.values() if count > len(blocks) * 0.15]
    
    return len(significant_groups) if len(significant_groups) > 1 else 1
