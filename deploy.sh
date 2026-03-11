#!/bin/bash
set -e

echo "🚀 Desplegando Text Reader Application"
echo "========================================"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# 1. Instalar dependencias del backend
echo -e "\n${BLUE}📦 Instalando dependencias del backend...${NC}"
cd backend
npm install

# 2. Instalar dependencias de las lambdas
echo -e "\n${BLUE}📦 Instalando dependencias de Lambda...${NC}"
cd lambda/process-image
pip3 install -r requirements.txt -t . 2>/dev/null || pip install -r requirements.txt -t . 2>/dev/null || echo "Skipping pip install (boto3 available in Lambda runtime)"
cd ../text-to-speech
pip3 install -r requirements.txt -t . 2>/dev/null || pip install -r requirements.txt -t . 2>/dev/null || echo "Skipping pip install (boto3 available in Lambda runtime)"
cd ../..

# 3. Build del frontend
echo -e "\n${BLUE}🔨 Construyendo frontend...${NC}"
cd ../frontend
npm install

# Obtener la URL del API si ya existe el stack
API_URL=$(aws cloudformation describe-stacks --stack-name TextReaderStack --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo -e "${BLUE}ℹ️  Primera vez desplegando, usando URL temporal${NC}"
    echo "REACT_APP_API_URL=PLACEHOLDER" > .env.production
else
    echo -e "${GREEN}✅ Usando API URL existente: $API_URL${NC}"
    echo "REACT_APP_API_URL=$API_URL" > .env.production
fi

npm run build

# 4. Desplegar con CDK
echo -e "\n${BLUE}☁️  Desplegando infraestructura en AWS...${NC}"
cd ../backend

# Bootstrap CDK si es necesario
if ! aws cloudformation describe-stacks --stack-name CDKToolkit &> /dev/null; then
    echo -e "${BLUE}🔧 Inicializando CDK Bootstrap...${NC}"
    npx cdk bootstrap
fi

# Desplegar
npx cdk deploy --require-approval never

# 5. Obtener outputs
echo -e "\n${GREEN}✅ Despliegue completado!${NC}"
echo -e "\n${BLUE}📋 Información del despliegue:${NC}"
echo "================================"

API_URL=$(aws cloudformation describe-stacks --stack-name TextReaderStack --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
WEBSITE_URL=$(aws cloudformation describe-stacks --stack-name TextReaderStack --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text)

echo -e "${GREEN}🌐 Website URL:${NC} $WEBSITE_URL"
echo -e "${GREEN}🔌 API URL:${NC} $API_URL"

# 6. Si la URL del API cambió, rebuild y redeploy frontend
if [ "$API_URL" != "PLACEHOLDER" ]; then
    CURRENT_API=$(cat ../frontend/.env.production | grep REACT_APP_API_URL | cut -d '=' -f2)
    if [ "$CURRENT_API" != "$API_URL" ]; then
        echo -e "\n${BLUE}🔄 Actualizando frontend con la URL correcta del API...${NC}"
        cd ../frontend
        echo "REACT_APP_API_URL=$API_URL" > .env.production
        npm run build
        
        cd ../backend
        npx cdk deploy --require-approval never
        
        echo -e "${GREEN}✅ Frontend actualizado!${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 Aplicación desplegada exitosamente!${NC}"
echo -e "${BLUE}Accede a tu aplicación en:${NC} $WEBSITE_URL"
