#!/bin/bash
# =====================================================
# V-RAG Database Setup Script (NUCLEAR RESET)
# =====================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SQL="$PROJECT_ROOT/master_setup.sql"

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}       V-RAG Database NUCLEAR RESET                 ${NC}"
echo -e "${YELLOW}====================================================${NC}"

# 1. Check PostgreSQL Connection
echo -e "\n${BLUE}[1/3] PostgreSQL Bağlantısı Kontrol Ediliyor...${NC}"
for i in {1..15}; do
    if docker exec ai_postgres pg_isready -U ai_user -d cognitive_db &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL hazır.${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ PostgreSQL bağlantısı kurulamadı! Docker çalışıyor mu?${NC}"
        exit 1
    fi
    sleep 2
done

# 2. Nuclear Wipe (Drop Schema)
echo -e "\n${BLUE}[2/3] Veritabanı Sıfırlanıyor (WIPE)...${NC}"
docker exec -i ai_postgres psql -U ai_user -d cognitive_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ai_user; GRANT ALL ON SCHEMA public TO public;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Şema temizlendi.${NC}"
else
    echo -e "${RED}❌ Sıfırlama başarısız!${NC}"
    exit 1
fi

# 3. Master Setup
echo -e "\n${BLUE}[3/3] Master Setup SQL Çalıştırılıyor...${NC}"
if [ ! -f "$SETUP_SQL" ]; then
    echo -e "${RED}❌ master_setup.sql bulunamadı!${NC}"
    exit 1
fi

docker exec -i ai_postgres psql -U ai_user -d cognitive_db < "$SETUP_SQL"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Database Rebuild Başarıyla Tamamlandı!${NC}"
else
    echo -e "\n${RED}❌ Kurulum sırasında hata oluştu.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}====================================================${NC}"
echo -e "  ${GREEN}Admin Giriş Bilgileri:${NC}"
echo -e "    Email:    admin@admin.com"
echo -e "    Password: admin123"
echo -e ""
echo -e "  ${YELLOW}Sistem Hazır!${NC}"
echo -e "${YELLOW}====================================================${NC}"
