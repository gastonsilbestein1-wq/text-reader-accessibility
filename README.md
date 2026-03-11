# Text Reader for Visually Impaired / Lector de Texto para Personas con Discapacidad Visual

Aplicación web progresiva que permite a personas con problemas visuales capturar texto mediante la cámara de su dispositivo y escucharlo reproducido en audio.

## 🏗️ Arquitectura

- **Frontend**: React PWA con acceso a cámara (S3 + CloudFront)
- **Backend**: AWS Serverless (API Gateway + Lambda + S3 + Textract + Polly)
- **Idiomas**: Inglés, Español, Español Latino
- **IaC**: AWS CDK (CloudFormation)

## 🚀 Servicios AWS

- **Textract**: Extracción de texto de imágenes
- **Polly**: Conversión de texto a voz (voces neurales)
- **S3**: Almacenamiento de datos y hosting web
- **Lambda**: Procesamiento serverless
- **API Gateway**: REST API
- **CloudFront**: CDN global para el frontend

## 📋 Requisitos Previos

- Node.js 18+
- Python 3.11+
- AWS CLI configurado con credenciales
- Cuenta AWS con acceso a Textract y Polly
- Git

```bash
# Configurar AWS CLI
aws configure
```

## 🚀 Despliegue Completo

### Despliegue Automático (Recomendado)

```bash
# Hacer el script ejecutable
chmod +x deploy.sh

# Desplegar todo (backend + frontend)
./deploy.sh
```

El script automáticamente:
1. Instala dependencias
2. Construye el frontend
3. Despliega infraestructura con CDK
4. Sube el frontend a S3/CloudFront
5. Muestra las URLs de acceso

### Despliegue Manual

```bash
# 1. Backend
cd backend
npm install
npx cdk bootstrap  # Solo primera vez
npx cdk deploy

# 2. Frontend
cd ../frontend
npm install
# Crear .env.production con la URL del API Gateway
echo "REACT_APP_API_URL=<API_URL_FROM_CDK_OUTPUT>" > .env.production
npm run build

# 3. Subir frontend a S3 (se hace automáticamente con CDK)
```

## 🗑️ Eliminar Recursos

```bash
chmod +x destroy.sh
./destroy.sh
```

## 🔧 Desarrollo Local

Para desarrollo local, ver `backend/local-server.py` (requiere credenciales AWS).

## 📦 Estructura del Proyecto

```
├── frontend/              # React PWA
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/              # AWS CDK + Lambda
│   ├── lib/             # Stack de CDK
│   ├── lambda/          # Funciones Lambda
│   │   ├── process-image/
│   │   └── text-to-speech/
│   └── bin/
├── deploy.sh            # Script de despliegue
├── destroy.sh           # Script de limpieza
└── README.md
```

## 🌐 URLs Post-Despliegue

Después del despliegue, obtendrás:
- **Website URL**: URL de CloudFront para acceder a la aplicación
- **API URL**: URL del API Gateway

## 💰 Costos Estimados

- **Textract**: ~$1.50 por 1000 páginas
- **Polly**: ~$4 por 1 millón de caracteres
- **Lambda**: Capa gratuita generosa
- **S3 + CloudFront**: Mínimo para MVP

## 🔐 Seguridad

- CORS configurado para producción
- HTTPS obligatorio en CloudFront
- Permisos IAM mínimos necesarios
- Buckets S3 con políticas restrictivas
