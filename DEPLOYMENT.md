# Guía de Despliegue - OCO-NO Text Reader

## ✅ Estado del Proyecto

- **Repositorio Git**: ✅ Actualizado y sincronizado
- **CloudFormation/CDK**: ✅ Configurado y probado
- **Scripts de despliegue**: ✅ Funcionales y testeados
- **Última versión desplegada**: https://d3p57ma1npow9v.cloudfront.net

## 🚀 Despliegue en Nuevos Entornos

### Requisitos Previos

1. **AWS CLI configurado**
   ```bash
   aws configure
   # Ingresa: Access Key, Secret Key, Region (us-east-1), Output format (json)
   ```

2. **Verificar credenciales**
   ```bash
   aws sts get-caller-identity
   ```

3. **Node.js y Python instalados**
   ```bash
   node --version  # >= 18
   python3 --version  # >= 3.11
   ```

### Pasos de Despliegue

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/gastonsilbestein1-wq/text-reader-accessibility.git
cd text-reader-accessibility
```

#### 2. Desplegar Automáticamente
```bash
chmod +x deploy.sh
./deploy.sh
```

El script ejecuta:
- ✅ Instalación de dependencias (backend y frontend)
- ✅ Instalación de dependencias de Lambda (boto3)
- ✅ Build del frontend React
- ✅ Bootstrap de CDK (primera vez)
- ✅ Despliegue de infraestructura CloudFormation
- ✅ Subida del frontend a S3/CloudFront
- ✅ Invalidación de caché de CloudFront

#### 3. Obtener URLs
Al finalizar el despliegue verás:
```
🌐 Website URL: https://[tu-cloudfront-id].cloudfront.net
🔌 API URL: https://[tu-api-id].execute-api.us-east-1.amazonaws.com/prod/
```

### Despliegue en Diferentes Regiones

Para desplegar en otra región AWS:

```bash
# Editar backend/bin/app.ts
# Cambiar: region: 'us-east-1' por tu región deseada

# Luego desplegar
./deploy.sh
```

### Despliegue en Múltiples Cuentas AWS

Para cada cuenta AWS:

1. Configurar perfil AWS
   ```bash
   aws configure --profile cuenta-dev
   aws configure --profile cuenta-prod
   ```

2. Desplegar con perfil específico
   ```bash
   AWS_PROFILE=cuenta-dev ./deploy.sh
   AWS_PROFILE=cuenta-prod ./deploy.sh
   ```

## 🗑️ Eliminar Recursos

Para eliminar todos los recursos de AWS:

```bash
chmod +x destroy.sh
./destroy.sh
```

⚠️ **ADVERTENCIA**: Esto eliminará:
- Stack de CloudFormation
- Buckets S3 (y su contenido)
- Lambdas
- API Gateway
- CloudFront Distribution
- Roles IAM

## 📦 Estructura de Recursos Desplegados

### Backend (CloudFormation Stack: TextReaderStack)
- **2 Buckets S3**:
  - `TextReaderDataBucket`: Almacena imágenes y audio
  - `TextReaderWebsiteBucket`: Hosting del frontend
  
- **2 Funciones Lambda**:
  - `ProcessImageFunction`: Extracción de texto con Textract
  - `TextToSpeechFunction`: Conversión a audio con Polly
  
- **API Gateway**: REST API con 2 endpoints
  - `POST /process`: Procesar imagen
  - `POST /speak`: Generar audio
  
- **CloudFront Distribution**: CDN para el frontend
  
- **Roles IAM**: Permisos mínimos necesarios

### Frontend
- React PWA
- Desplegado en S3 + CloudFront
- HTTPS obligatorio
- Caché optimizado

## 🔧 Configuración de Entornos

### Variables de Entorno

**Frontend** (`frontend/.env.production`):
```bash
REACT_APP_API_URL=https://[tu-api-id].execute-api.us-east-1.amazonaws.com/prod/
```

**Backend** (configurado automáticamente por CDK):
- `BUCKET_NAME`: Nombre del bucket de datos

### Personalización

Para cambiar nombres de recursos, editar `backend/lib/text-reader-stack.ts`:

```typescript
const bucket = new s3.Bucket(this, 'MiNombrePersonalizado', {
  // ...
});
```

## 📊 Monitoreo

### CloudWatch Logs
```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/TextReaderStack-ProcessImageFunction --follow
aws logs tail /aws/lambda/TextReaderStack-TextToSpeechFunction --follow
```

### Métricas
- CloudWatch Dashboard: Buscar "TextReaderStack" en la consola AWS
- Métricas de Lambda: Invocaciones, errores, duración
- Métricas de API Gateway: Requests, latencia, errores 4xx/5xx

## 🔐 Seguridad

- ✅ HTTPS obligatorio en CloudFront
- ✅ CORS configurado correctamente
- ✅ Permisos IAM con principio de mínimo privilegio
- ✅ Buckets S3 con políticas restrictivas
- ✅ API Gateway con throttling configurado

## 💰 Costos Estimados

**Por 1000 usuarios/mes**:
- Textract: ~$1.50 (1000 páginas)
- Polly: ~$0.40 (100,000 caracteres)
- Lambda: Gratis (dentro de capa gratuita)
- S3: ~$0.50
- CloudFront: ~$1.00
- **Total estimado**: ~$3.50/mes

## 🆘 Troubleshooting

### Error: "CDKToolkit stack not found"
```bash
cd backend
npx cdk bootstrap
```

### Error: "Access Denied" en S3
Verificar permisos IAM del usuario AWS CLI

### Frontend no se actualiza
```bash
# Invalidar caché de CloudFront
aws cloudfront create-invalidation \
  --distribution-id [TU_DISTRIBUTION_ID] \
  --paths "/*"
```

### Lambda timeout
Aumentar timeout en `backend/lib/text-reader-stack.ts`:
```typescript
timeout: cdk.Duration.seconds(60)
```

## 📝 Notas Importantes

1. **Primera vez**: El bootstrap de CDK puede tardar 5-10 minutos
2. **CloudFront**: La distribución puede tardar 15-20 minutos en propagarse
3. **Costos**: Monitorear uso de Textract y Polly para evitar sorpresas
4. **Límites**: AWS tiene límites de servicio (quotas) que pueden requerir aumento

## 🔄 Actualizaciones

Para actualizar una instalación existente:

```bash
git pull origin main
./deploy.sh
```

El script detecta automáticamente si es una actualización y solo despliega los cambios.

## 📞 Soporte

- **Issues**: https://github.com/gastonsilbestein1-wq/text-reader-accessibility/issues
- **Documentación AWS CDK**: https://docs.aws.amazon.com/cdk/
- **Documentación Textract**: https://docs.aws.amazon.com/textract/
- **Documentación Polly**: https://docs.aws.amazon.com/polly/
