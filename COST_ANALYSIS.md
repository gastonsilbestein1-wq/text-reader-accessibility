# Análisis de Costos - OCO-NO Text Reader

## Arquitectura Actual
- **Extracción de texto**: Amazon Nova 2.0 Lite (Bedrock) — reemplazó Textract
- **Síntesis de voz**: Amazon Polly Neural (voz Mia, es-MX)
- **Hosting**: CloudFront + S3
- **API**: API Gateway + Lambda
- **Región**: us-east-1
- **Última actualización**: 31 de Marzo, 2026

---

## Precios Unitarios Reales (us-east-1, on-demand, verificados 31/03/2026)

| Servicio | Precio |
|----------|--------|
| **Nova 2.0 Lite - Input tokens** | $0.00033 / 1K tokens |
| **Nova 2.0 Lite - Output tokens** | $0.00275 / 1K tokens |
| **Polly Neural** | $0.000016 / carácter ($16 / 1M) |
| **Lambda** | $0.20 / 1M invocaciones + $0.0000166667 / GB-s |
| **API Gateway** | $3.50 / 1M requests |
| **S3 Storage** | $0.023 / GB-mes |
| **CloudFront Data Transfer** | $0.085 / GB |

---

## Supuestos por foto procesada

| Concepto | Valor | Justificación |
|----------|-------|---------------|
| Input tokens Nova | 1,500 tokens | Imagen + system prompt (~900 tokens) + instrucción |
| Output tokens Nova | 500 tokens | ~375 palabras de texto transcripto |
| Caracteres Polly | 1,500 chars | Texto transcripto promedio |
| Lambda duración | 5s × 512MB = 2.5 GB-s | Tiempo de respuesta Bedrock + Polly |
| API Gateway requests | 2 por foto | 1 `/process` + 1 `/speak` |
| Audio generado | ~150 KB por foto | MP3 de ~30 segundos |

---

## Costo por foto individual

| Servicio | Cálculo | Costo |
|----------|---------|-------|
| Nova 2.0 Lite input | 1.5K tokens × $0.00033 | $0.000495 |
| Nova 2.0 Lite output | 0.5K tokens × $0.00275 | $0.001375 |
| Polly Neural | 1,500 chars × $0.000016 | $0.000024 |
| Lambda (2 funciones) | 2 inv + 5GB-s × $0.0000166667 | $0.000083 |
| API Gateway | 2 requests × $0.0000035 | $0.000007 |
| S3 + CloudFront | ~150KB audio | $0.000013 |
| **TOTAL POR FOTO** | | **~$0.002 USD** |

---

## Escenarios: 100 fotos/usuario/mes

### 1 usuario — 100 fotos/mes

| Servicio | Cálculo | Costo |
|----------|---------|-------|
| Nova 2.0 Lite input | 150K tokens × $0.00033 | $0.050 |
| Nova 2.0 Lite output | 50K tokens × $0.00275 | $0.138 |
| Polly Neural | 150,000 chars × $0.000016 | $0.002 |
| Lambda | 200 inv + 500 GB-s × $0.0000166667 | $0.008 |
| API Gateway | 200 requests | $0.001 |
| S3 Storage | ~15 MB audio | $0.001 |
| CloudFront | ~15 MB | $0.001 |
| **TOTAL MENSUAL** | | **~$0.20 USD/mes** |

---

### 10 usuarios — 1,000 fotos/mes

| Servicio | Cálculo | Costo |
|----------|---------|-------|
| Nova 2.0 Lite input | 1.5M tokens × $0.00033 | $0.495 |
| Nova 2.0 Lite output | 500K tokens × $0.00275 | $1.375 |
| Polly Neural | 1.5M chars × $0.000016 | $0.024 |
| Lambda | 2,000 inv + 5,000 GB-s × $0.0000166667 | $0.083 |
| API Gateway | 2,000 requests | $0.007 |
| S3 Storage | ~150 MB audio | $0.003 |
| CloudFront | ~150 MB | $0.013 |
| **TOTAL MENSUAL** | | **~$2.00 USD/mes** |

**Costo por usuario**: $0.20 USD

---

### 100 usuarios — 10,000 fotos/mes

| Servicio | Cálculo | Costo |
|----------|---------|-------|
| Nova 2.0 Lite input | 15M tokens × $0.00033 | $4.95 |
| Nova 2.0 Lite output | 5M tokens × $0.00275 | $13.75 |
| Polly Neural | 15M chars × $0.000016 | $0.24 |
| Lambda | 20,000 inv + 50,000 GB-s × $0.0000166667 | $0.83 |
| API Gateway | 20,000 requests | $0.07 |
| S3 Storage | ~1.5 GB audio | $0.035 |
| CloudFront | ~1.5 GB | $0.128 |
| **TOTAL MENSUAL** | | **~$20.00 USD/mes** |

**Costo por usuario**: $0.20 USD

---

## Resumen comparativo

| Usuarios | Fotos/mes | Costo total | Costo/usuario | Costo/foto |
|----------|-----------|-------------|---------------|------------|
| 1 | 100 | **$0.20** | $0.20 | $0.002 |
| 10 | 1,000 | **$2.00** | $0.20 | $0.002 |
| 100 | 10,000 | **$20.00** | $0.20 | $0.002 |

> El costo escala linealmente: **$0.20 por usuario/mes** con 100 fotos, independientemente del volumen.
> El costo dominante es Nova 2.0 Lite (output tokens = 73% del total por foto).

---

## Desglose por servicio (% del costo total por foto)

| Servicio | Costo/foto | % |
|----------|-----------|---|
| Nova 2.0 Lite output tokens | $0.001375 | 69% |
| Nova 2.0 Lite input tokens | $0.000495 | 25% |
| Lambda | $0.000083 | 4% |
| Polly Neural | $0.000024 | 1% |
| API GW + S3 + CF | $0.000020 | 1% |
| **Total** | **$0.001997** | 100% |

> Polly es casi gratuito a esta escala. El costo real está en Nova Lite 2 (94% del total).

---

## Recursos activos en la cuenta

| Stack | Proyecto | Estado |
|-------|----------|--------|
| `TextReaderStack` | OCO-NO | ✅ Activo |
| `fiscal-document-processor-dev` | Otro proyecto | ✅ Activo |
| `CDKToolkit` | Bootstrap CDK | ✅ Necesario |

> No se encontraron recursos huérfanos. Cuenta limpia.

---

## Precios Unitarios (us-east-1)

| Servicio | Precio |
|----------|--------|
| **Nova Lite 2 - Input tokens** | $0.00006 / 1K tokens |
| **Nova Lite 2 - Output tokens** | $0.00024 / 1K tokens |
| **Polly Neural** | $16.00 / 1M caracteres |
| **Lambda** | $0.20 / 1M invocaciones + $0.0000166667 / GB-s |
| **API Gateway** | $3.50 / 1M requests |
| **S3 Storage** | $0.023 / GB-mes |
| **CloudFront Data Transfer** | $0.085 / GB |

> Una imagen típica consume ~1,000 tokens de entrada (imagen) + ~500 tokens de salida (texto transcripto).
> Costo Nova Lite 2 por imagen: ~$0.00018 vs Textract AnalyzeDocument: $0.05 → **277x más barato**

---

## Escenario 1: Uso Moderado (1,000 usuarios/mes)

Asumiendo: 3 fotos/usuario, ~1,000 caracteres de texto por foto, 1 audio por foto.

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Nova Lite 2** | 3,000 imgs × (1K input + 0.5K output tokens) × tarifas | $0.54 |
| **Polly Neural** | 3M caracteres × $16/1M | $48.00 |
| **Lambda** | 6,000 invocaciones × 2 funciones | $0.00 |
| **Lambda Duration** | 6,000 × 5s × 0.5GB × $0.0000166667 | $0.25 |
| **API Gateway** | 6,000 requests × $3.50/1M | $0.02 |
| **S3 Storage** | ~200 MB audio | $0.005 |
| **CloudFront** | ~2 GB | $0.17 |
| **TOTAL MENSUAL** | | **~$49 USD/mes** |

**Costo por usuario**: ~$0.049 USD
**vs arquitectura anterior (con Textract)**: ~$198 USD/mes → **ahorro del 75%**

---

## Escenario 2: Uso Alto (10,000 usuarios/mes)

Asumiendo: 5 fotos/usuario, ~1,250 caracteres por foto.

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Nova Lite 2** | 50,000 imgs × tarifas | $9.00 |
| **Polly Neural** | 62.5M caracteres × $16/1M | $1,000.00 |
| **Lambda** | 150,000 invocaciones | $0.03 |
| **Lambda Duration** | 150,000 × 5s × 0.5GB | $6.25 |
| **API Gateway** | 150,000 requests | $0.53 |
| **S3 Storage** | ~5 GB | $0.12 |
| **CloudFront** | ~50 GB | $4.25 |
| **TOTAL MENSUAL** | | **~$1,020 USD/mes** |

**Costo por usuario**: ~$0.102 USD
**vs arquitectura anterior**: ~$1,088 USD/mes → **ahorro del 6%** (Polly domina el costo)

---

## Escenario 3: Uso Muy Intensivo (100,000 usuarios/mes)

| Servicio | Cálculo | Costo Mensual |
|----------|---------|---------------|
| **Nova Lite 2** | 1M imgs × tarifas | $180.00 |
| **Polly Neural** | 3B caracteres × $16/1M | $48,000.00 |
| **Lambda + API GW** | 3M invocaciones | $170.00 |
| **S3 + CloudFront** | ~1 TB | $90.00 |
| **TOTAL MENSUAL** | | **~$48,440 USD/mes** |

**Costo por usuario**: ~$0.484 USD

---

## Comparativa: Antes vs Ahora

| Escenario | Textract + Polly | Nova Lite 2 + Polly | Ahorro |
|-----------|-----------------|---------------------|--------|
| 1,000 usuarios | $198/mes | $49/mes | **75%** |
| 10,000 usuarios | $1,088/mes | $1,020/mes | 6% |
| 100,000 usuarios | $49,778/mes | $48,440/mes | 3% |

> A escala, Polly domina el costo (>95%). El mayor impacto de Nova Lite 2 se siente en volúmenes bajos/medios.

---

## El Cuello de Botella: Polly

Polly Neural representa más del 95% del costo total a escala. Opciones:

### Opción A: Polly Standard (ahorro inmediato)
- $4/1M caracteres vs $16/1M → **ahorro del 75% en audio**
- Calidad de voz ligeramente inferior pero funcional
- Cambio de una línea en el código: `Engine='standard'`

| Escenario | Con Neural | Con Standard | Ahorro |
|-----------|-----------|--------------|--------|
| 1,000 usuarios | $49/mes | $13/mes | $36/mes |
| 10,000 usuarios | $1,020/mes | $270/mes | $750/mes |
| 100,000 usuarios | $48,440/mes | $12,440/mes | $36,000/mes |

### Opción B: Caché de audio en S3
- Textos idénticos reutilizan el mismo MP3
- Útil si hay textos repetidos (señales, etiquetas comunes)
- Requiere DynamoDB para mapear hash(texto) → URL

### Opción C: Límite de caracteres por request
- Truncar a 1,500 caracteres para lectura (suficiente para un artículo)
- Reducción directa del costo de Polly

---

## Costo Base Mensual (sin uso)

| Recurso | Costo |
|---------|-------|
| S3 Storage (mínimo) | ~$0.001/mes |
| CloudFront (sin tráfico) | $0.00 |
| Lambda (sin invocaciones) | $0.00 |
| API Gateway (sin requests) | $0.00 |
| **Total base** | **~$0.001/mes** |

---

## Recursos Activos en la Cuenta

| Stack | Proyecto | Estado |
|-------|----------|--------|
| `TextReaderStack` | OCO-NO | ✅ Activo |
| `fiscal-document-processor-dev` | Otro proyecto | ✅ Activo (tiene ejecuciones recientes) |
| `CDKToolkit` | Bootstrap CDK | ✅ Necesario |

> No se encontraron recursos huérfanos ni stacks obsoletos. La cuenta está limpia.

---

## Recomendaciones

### MVP / Pruebas (ahora)
- Mantener configuración actual con Polly Neural
- Costo estimado con uso de pruebas: < $1/mes

### Lanzamiento (1,000–10,000 usuarios)
- Evaluar cambio a Polly Standard para reducir costos 75%
- Implementar límite de ~1,500 caracteres por audio
- Costo estimado: $13–$270/mes

### Escala (100,000+ usuarios)
- Implementar caché de audio con DynamoDB
- Modelo freemium: tier gratuito con Standard, premium con Neural
- Costo estimado: $12,000–$48,000/mes con ingresos potenciales de $299,000/mes
