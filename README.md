# OCO-NO — Lector de Texto para Personas con Discapacidad Visual

Aplicación web que permite capturar texto mediante la cámara del celular y escucharlo en audio, diseñada para personas con problemas visuales.

## Arquitectura

- **Frontend**: React PWA con acceso a cámara (S3 + CloudFront)
- **Extracción de texto**: Amazon Nova 2.0 Lite (Bedrock) — detección automática de tipo de documento
- **Síntesis de voz**: Amazon Polly Neural (voz Mia, es-MX / Joanna, en-US)
- **IaC**: AWS CDK (TypeScript)
- **Idiomas**: Español Latino (default), Inglés

## Servicios AWS

- **Bedrock (Nova 2.0 Lite)**: Extracción de texto con comprensión de layout, columnas y tablas
- **Polly Neural**: Conversión de texto a voz en español latino e inglés
- **S3**: Almacenamiento de audio y hosting web
- **Lambda**: Procesamiento serverless
- **API Gateway**: REST API
- **CloudFront**: CDN global para el frontend

## URLs

- **App**: https://d3p57ma1npow9v.cloudfront.net
- **API**: https://csserh9nu9.execute-api.us-east-1.amazonaws.com/prod/
- **Repo**: https://github.com/gastonsilbestein1-wq/text-reader-accessibility

## Requisitos

- Node.js 18+
- Python 3.11+
- AWS CLI configurado (`aws configure`)

## Despliegue

```bash
# Clonar
git clone https://github.com/gastonsilbestein1-wq/text-reader-accessibility.git
cd text-reader-accessibility

# Desplegar
chmod +x deploy.sh
./deploy.sh
```

### Manual

```bash
# Backend
cd backend
npm install
npx cdk bootstrap  # solo primera vez
npm run build
npx cdk deploy

# Frontend
cd ../frontend
npm install
npm run build
# El CDK sube el build automáticamente
```

## Eliminar recursos

```bash
chmod +x destroy.sh
./destroy.sh
```

## Estructura

```
├── frontend/              # React PWA
│   ├── src/App.js         # Componente principal
│   ├── src/App.css        # Estilos
│   ├── src/translations.js
│   └── public/
├── backend/
│   ├── lib/text-reader-stack.ts   # CDK Stack
│   ├── lambda/
│   │   ├── process-image/index.py  # Nova 2.0 Lite (Bedrock)
│   │   └── text-to-speech/index.py # Polly Neural
│   └── bin/app.ts
├── COST_ANALYSIS.md
├── DEPLOYMENT.md
└── deploy.sh / destroy.sh
```

## Funcionalidades

- Cámara se activa automáticamente al abrir la app
- Captura con tap en la imagen o botón
- Detección automática del tipo de documento:
  - Texto corrido (libros, artículos, diarios) — columnas respetadas
  - Tablas y análisis de laboratorio — lectura fila por fila
  - Facturas y tickets — formato estructurado por ítem
  - Formularios — formato campo: valor
- Generación y reproducción automática de audio
- Selector de idioma Español Latino / English

## Seguridad

- HTTPS obligatorio (CloudFront)
- CORS configurado
- IAM con mínimo privilegio
- Throttling en API Gateway

## Costos

Ver `COST_ANALYSIS.md` para análisis detallado.
Resumen: ~$0.002 por foto procesada / ~$0.20 por usuario con 100 fotos/mes.
