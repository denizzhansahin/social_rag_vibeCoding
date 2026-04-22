import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def get_neo4j_driver():
    """Neo4j (Graf Veritabanı) sunucusuna bir driver nesnesi oluşturur."""
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")
    
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        print("✅ Neo4j'e başarıyla bağlandı.")
        return driver
    except Exception as e:
        print(f"❌ Neo4j bağlantı hatası: {e}")
        return None

def close_neo4j_driver(driver):
    """Neo4j driver'ını düzgün bir şekilde kapatır."""
    if driver:
        driver.close()
        print("Neo4j bağlantısı kapatıldı.")

neo4j_driver = get_neo4j_driver()
