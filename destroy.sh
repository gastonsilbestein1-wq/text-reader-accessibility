#!/bin/bash
set -e

echo "🗑️  Eliminando Text Reader Application"
echo "======================================="

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto eliminará todos los recursos de AWS${NC}"
read -p "¿Estás seguro? (escribe 'yes' para confirmar): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operación cancelada"
    exit 0
fi

cd backend
npx cdk destroy --force

echo -e "${RED}✅ Stack eliminado${NC}"
