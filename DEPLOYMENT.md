# Guía de Despliegue — OCO-NO

## Estado Actual

- **App**: https://d3p57ma1npow9v.cloudfront.net
- **API**: https://csserh9nu9.execute-api.us-east-1.amazonaws.com/prod/
- **Stack**: TextReaderStack — us-east-1
- **Cuenta AWS**: 805472282641

## Despliegue desde cero

### 1. Requisitos
```bash
node --version   # >= 18
python3 --version # >= 3.11
aws sts get-caller-identity  # verificar credenciales
```

### 2. Clonar y desplegar
```bash
git clone https://github.com/gastonsilbestein1-wq/text-reader-accessibility.git
cd text-reader-accessibility
chmod +x deploy.sh
./deploy.sh
```

### 3. Despliegue manual paso a paso
```bash
# Frontend
cd frontend && npm install && npm run build

# Backend
cd ../backend && npm install && npm run build
npx cdk bootstrap  # solo primera vez por cuenta/región
npx cdk deploy --require-approval never
```

## Actualizar despliegue existente

```bash
git pull origin main
cd frontend && npm run build
cd ../backend && npm run build && npx cdk deploy --require-approval never
```

## Recursos desplegados (TextReaderStack)

| Recurso | Nombre/ID |
|---------|-----------|
| S3 datos | textreaderstack-textreaderdatabucket4441a081-vysqfrtzoh2u |
| S3 website | textreaderstack-textreaderwebsitebuckete194db75-7p47nhksog9q |
| Lambda extracción | ProcessImageFunction (Nova 2.0 Lite) |
| Lambda audio | TextToSpeechFunction (Polly Neural) |
| API Gateway | csserh9nu9 |
| CloudFront | d3p57ma1npow9v.cloudfront.net |

## Endpoints API

| Método | Path | Función |
|--------|------|---------|
| POST | /process | Extrae texto de imagen con Nova 2.0 Lite |
| POST | /speak | Genera audio MP3 con Polly Neural |

## Notas importantes

**Bedrock / Nova 2.0 Lite:**
- Model ID: `us.amazon.nova-2-lite-v1:0` (inference profile cross-region)
- El inference profile enruta automáticamente entre us-east-1, us-east-2 y us-west-2
- Los modelos se activan automáticamente al primer uso en cada región
- IAM policy requiere `bedrock:InvokeModel` con `Resource: *`

**Polly:**
- Voz es-MX: Mia (Neural)
- Voz en-US: Joanna (Neural)
- Textos largos se dividen automáticamente en chunks de 2900 caracteres

## Múltiples entornos

```bash
# Con perfil AWS específico
AWS_PROFILE=mi-perfil npx cdk deploy

# En otra región (editar backend/bin/app.ts primero)
npx cdk deploy --context region=eu-west-1
```

## Eliminar recursos

```bash
chmod +x destroy.sh
./destroy.sh
# o manualmente:
cd backend && npx cdk destroy --force
```

## Monitoreo

```bash
# Logs Lambda extracción
aws logs tail /aws/lambda/TextReaderStack-ProcessImageFunction340ACD7C-ASJEnSWqrTfj --follow

# Logs Lambda audio
aws logs tail /aws/lambda/TextReaderStack-TextToSpeechFunction12183EFB-jNvhhWwpI2bU --follow
```

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|---------|
| `AccessDeniedException` en Bedrock | IAM sin permiso cross-region | Verificar `Resource: *` en policy |
| `ValidationException: on-demand throughput not supported` | Usando model ID directo | Usar inference profile `us.amazon.nova-2-lite-v1:0` |
| `TextLengthExceededException` en Polly | Texto > 3000 chars | Ya resuelto con chunking automático |
| Imagen de baja calidad (falso positivo) | Lambda retorna error | Revisar logs con `aws logs tail` |
| CDKToolkit not found | CDK no inicializado | `npx cdk bootstrap` |
