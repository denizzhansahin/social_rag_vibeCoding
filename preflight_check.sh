#!/bin/bash

# =====================================================
# V-RAG Preflight Check Script
# Verifies connectivity to all infra and AI components
# Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
# =====================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "-----------------------------------------------------"
echo "🚀 V-RAG Preflight Connectivity Check"
echo "-----------------------------------------------------"

# 1. PostgreSQL Check
echo -n "Checking PostgreSQL (5432)... "
if command -v psql &> /dev/null; then
    PGPASS=ai_password_123 psql -h localhost -U ai_user -d cognitive_db -c "SELECT 1;" &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}SUCCESS${NC}"
    else
        echo -e "${RED}FAILED${NC} (Check credentials or if DB is ready)"
    fi
else
    # Fallback to nc if psql not installed
    nc -z localhost 5432 &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}UP (Port Active)${NC}"
    else
        echo -e "${RED}DOWN${NC}"
    fi
fi

# 2. Redis Check
echo -n "Checking Redis (6379)...      "
nc -z localhost 6379 &> /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

# 3. Qdrant Check
echo -n "Checking Qdrant (6333)...     "
curl -s http://localhost:6333/ | grep -q "qdrant"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

# 4. Neo4j Check
echo -n "Checking Neo4j Bolt (7687)... "
nc -z localhost 7687 &> /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}UP (Port Active)${NC}"
else
    echo -e "${RED}DOWN${NC}"
fi

# 6. AI Worker (Anaconda) Check
echo -n "Checking Conda Env (ai_core)..."
CONDA_PATH="/opt/anaconda3/bin/conda"
if [ -f "$CONDA_PATH" ]; then
    # Test if we can import key libraries in the environment
    "$CONDA_PATH" run -n ai_core python -c "import redis, psycopg2, qdrant_client, neo4j" &> /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}SUCCESS (ai_core ready)${NC}"
    else
        echo -e "${RED}FAILED${NC} (Environment exists but dependencies missing)"
    fi
else
    echo -e "${RED}FAILED${NC} (Conda not found at /opt/anaconda3/bin/conda)"
fi

echo "-----------------------------------------------------"
echo "✅ Infrastructure Check Complete"
echo "-----------------------------------------------------"

# // Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.