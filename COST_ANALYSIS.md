# Análisis de Costos - OCO-NO Text Reader

## 💰 Costos Actuales (Desarrollo/Pruebas)

### Recursos Desplegados
- **Fecha de despliegue**: 11 de Marzo, 2026
- **Región**: us-east-1
- **Tiempo activo**: ~2 horas

### Estimación de Costos de Pruebas (Hoy)

| Servicio | Uso Estimado | Costo |
|----------|--------------|-------|
| **Lambda (2 funciones)** | ~10 invocaciones | $0.00 (Capa gratuita) |
| **Textract** | ~5 páginas procesadas | $0.0075 ($0.0015/página) |
| **Polly** | ~500 caracteres | $0.002 ($4/1M caracteres) |
| **S3 Storage** | ~50 MB | $0.001 |
| **S3 Requests** | ~20 requests | $0.00 |
| **CloudFront** | ~10 requests, 5 MB | $0.00 (Capa gratuita) |
| **API Gateway** | ~10 requests | $0.00 (Capa gratuita) |
| **CloudWatch Logs** | ~10 MB | $0.00 |
| **TOTAL ESTIMADO HOY** | | **~$0.01 USD** |

### Costos Fijos Mensuales (Infraestructura Activa)
- **S3 Storage**: $0.023/GB/mes × 0.05 GB = $0.001/mes
- **CloudFront**: Sin costo fijo, solo por uso
- **Lambda**: Sin costo fijo
- **API Gateway**: Sin costo fijo

**Costo base mensual (sin uso)**: ~$0.001 USD/mes

---

## 📊 Estimación de Costos con Uso Intensivo

### Escenario 1: Uso Moderado (1,000 usuarios/mes)

**Asumiendo por usuario:**
- 3 fotos capturadas/mes
- Promedio 200 palabras por foto (1,000 caracteres)
- 1 reproducción de audio por foto

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Textract (AnalyzeDocument)** | 3,000 páginas × $0.05 | $150.00 |
| **Polly (Neural)** | 3M caracteres × $16/1M | $48.00 |
| **Lambda Invocations** | 6,000 × $0.20/1M | $0.001 |
| **Lambda Duration** | 6,000 × 3s × $0.0000166667/GB-s | $0.30 |
| **S3 Storage** | 500 MB × $0.023/GB | $0.012 |
| **S3 Requests** | 9,000 × $0.0004/1K | $0.004 |
| **CloudFront Data Transfer** | 2 GB × $0.085/GB | $0.17 |
| **CloudFront Requests** | 10,000 × $0.0075/10K | $0.008 |
| **API Gateway** | 6,000 × $3.50/1M | $0.021 |
| **CloudWatch Logs** | 100 MB × $0.50/GB | $0.05 |
| **TOTAL MENSUAL** | | **$198.56 USD/mes** |

**Costo por usuario**: $0.199 USD

**Nota**: Textract AnalyzeDocument con LAYOUT cuesta $0.05/página vs $0.0015/página de DetectDocumentText, pero es necesario para respetar el formato y columnas del texto.

---

### Escenario 2: Uso Alto (10,000 usuarios/mes)

**Asumiendo por usuario:**
- 5 fotos capturadas/mes
- Promedio 250 palabras por foto (1,250 caracteres)
- 1.5 reproducciones de audio por foto (algunos repiten)

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Textract** | 50,000 páginas × $0.0015 | $75.00 |
| **Polly (Neural)** | 62.5M caracteres × $16/1M | $1,000.00 |
| **Lambda Invocations** | 150,000 × $0.20/1M | $0.03 |
| **Lambda Duration** | 150,000 × 3s × $0.0000166667/GB-s | $7.50 |
| **S3 Storage** | 5 GB × $0.023/GB | $0.12 |
| **S3 Requests** | 225,000 × $0.0004/1K | $0.09 |
| **CloudFront Data Transfer** | 50 GB × $0.085/GB | $4.25 |
| **CloudFront Requests** | 250,000 × $0.0075/10K | $0.19 |
| **API Gateway** | 150,000 × $3.50/1M | $0.53 |
| **CloudWatch Logs** | 2 GB × $0.50/GB | $1.00 |
| **TOTAL MENSUAL** | | **$1,088.71 USD/mes** |

**Costo por usuario**: $0.109 USD

---

### Escenario 3: Uso Muy Intensivo (100,000 usuarios/mes)

**Asumiendo por usuario:**
- 10 fotos capturadas/mes
- Promedio 300 palabras por foto (1,500 caracteres)
- 2 reproducciones de audio por foto

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Textract** | 1M páginas × $0.0015 | $1,500.00 |
| **Polly (Neural)** | 3B caracteres × $16/1M | $48,000.00 |
| **Lambda Invocations** | 3M × $0.20/1M | $0.60 |
| **Lambda Duration** | 3M × 3s × $0.0000166667/GB-s | $150.00 |
| **S3 Storage** | 100 GB × $0.023/GB | $2.30 |
| **S3 Requests** | 4.5M × $0.0004/1K | $1.80 |
| **CloudFront Data Transfer** | 1 TB × $0.085/GB | $85.00 |
| **CloudFront Requests** | 5M × $0.0075/10K | $3.75 |
| **API Gateway** | 3M × $3.50/1M | $10.50 |
| **CloudWatch Logs** | 50 GB × $0.50/GB | $25.00 |
| **TOTAL MENSUAL** | | **$49,778.95 USD/mes** |

**Costo por usuario**: $0.498 USD

---

## 🎯 Optimizaciones de Costos Recomendadas

### 1. Polly es el Mayor Costo (90%+ del total)

**Opciones de optimización:**

#### A. Usar Voces Standard en lugar de Neural
- **Ahorro**: 75% en costos de Polly
- **Costo**: $4/1M caracteres vs $16/1M
- **Impacto**: Calidad de voz ligeramente inferior

```python
# En backend/lambda/text-to-speech/index.py
# Cambiar:
Engine='neural'  # $16/1M caracteres
# Por:
Engine='standard'  # $4/1M caracteres
```

**Nuevo costo Escenario 2**: $338.71/mes (ahorro de $750/mes)

#### B. Implementar Caché de Audio
- Cachear audios generados para textos comunes
- Usar DynamoDB para mapear texto → URL de audio
- Reutilizar audios ya generados

**Ahorro estimado**: 40-60% en costos de Polly

#### C. Limitar Longitud de Texto
- Máximo 500 palabras por procesamiento
- Cobrar por textos muy largos
- Dividir textos largos en chunks

#### D. Usar Polly bajo demanda
- Solo generar audio cuando el usuario presiona "play"
- No generar automáticamente

### 2. Textract Optimization

**Opciones:**

#### A. Usar OCR alternativo para casos simples
- Tesseract.js en el cliente para textos simples
- Textract solo para casos complejos
- **Ahorro**: 50-70% en costos de Textract

#### B. Comprimir imágenes antes de enviar
- Reducir resolución a 1920×1080 máximo
- Comprimir JPEG a 85% calidad
- **Ahorro**: Reduce costos de S3 y transferencia

### 3. Lambda Optimization

**Ya optimizado**, pero se puede:
- Aumentar memoria para reducir duración
- Usar Lambda SnapStart (Java/Python)

### 4. CloudFront Optimization

**Ya optimizado** con:
- Compresión automática
- Caché configurado
- HTTPS obligatorio

---

## 💡 Arquitectura Alternativa de Bajo Costo

### Opción: Modelo Freemium con Límites

**Tier Gratuito:**
- 10 fotos/mes por usuario
- Voces Standard
- Máximo 200 palabras por foto
- **Costo por usuario**: $0.02/mes

**Tier Premium ($2.99/mes):**
- 100 fotos/mes
- Voces Neural
- Máximo 500 palabras por foto
- **Costo por usuario**: $0.15/mes
- **Margen**: $2.84/usuario

---

## 📈 Proyección de Costos por Escala

| Usuarios/Mes | Costo Total (Neural) | Costo Total (Standard) | Costo/Usuario |
|--------------|---------------------|----------------------|---------------|
| 100 | $5.31 | $1.81 | $0.053 / $0.018 |
| 1,000 | $53.06 | $18.06 | $0.053 / $0.018 |
| 10,000 | $1,088.71 | $338.71 | $0.109 / $0.034 |
| 50,000 | $9,443.55 | $2,693.55 | $0.189 / $0.054 |
| 100,000 | $49,778.95 | $12,778.95 | $0.498 / $0.128 |

---

## 🔍 Monitoreo de Costos

### Configurar Alertas de Costos

```bash
# Crear alerta de presupuesto
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json
```

**budget.json:**
```json
{
  "BudgetName": "OCO-NO-Monthly-Budget",
  "BudgetLimit": {
    "Amount": "100",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Dashboard de Costos

Crear dashboard en CloudWatch para monitorear:
- Invocaciones de Lambda
- Caracteres procesados por Polly
- Páginas procesadas por Textract
- Transferencia de datos

---

## 🎯 Recomendaciones Finales

### Para MVP/Pruebas (Actual)
- ✅ Mantener configuración actual
- ✅ Costo actual: ~$0.01/día
- ✅ Perfecto para desarrollo

### Para Lanzamiento (1,000-10,000 usuarios)
- 🔄 Cambiar a voces Standard de Polly
- 🔄 Implementar caché de audio
- 🔄 Limitar longitud de texto a 500 palabras
- 💰 Costo estimado: $20-$350/mes

### Para Escala (100,000+ usuarios)
- 🔄 Implementar modelo Freemium
- 🔄 Usar CDN adicional para audio
- 🔄 Considerar Tesseract.js para OCR simple
- 🔄 Implementar rate limiting
- 💰 Costo estimado: $12,000-$50,000/mes
- 💵 Ingresos potenciales: $299,000/mes (con 100k usuarios premium)

---

## 📞 Contacto para Optimización

Para implementar optimizaciones de costos, revisar:
1. `backend/lambda/text-to-speech/index.py` - Cambiar engine
2. `frontend/src/App.js` - Implementar límites de texto
3. Agregar DynamoDB para caché de audio
4. Implementar Tesseract.js para OCR cliente
