import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "gemma3:4b")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "embeddinggemma")


def generate_embedding(text: str, model: str = None):
    """
    Verilen metni Ollama kullanarak bir vektör (embedding) haline getirir.
    Bu vektör Qdrant'a kaydedilecek.
    """
    model = model or EMBED_MODEL
    try:
        url = f"{OLLAMA_URL}/api/embeddings"
        payload = {
            "model": model,
            "prompt": text
        }
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        embedding = response.json().get("embedding")
        if embedding:
            print(f"✅ Embedding oluşturuldu (boyut: {len(embedding)})")
        return embedding
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama embedding hatası: {e}")
        return None


def generate_completion(prompt: str, model: str = None, system_prompt: str = None):
    """
    Verilen bir prompt'a Ollama ile metin tabanlı bir cevap üretir.
    (Örn: "Bu cümlenin duygu analizi nedir?")
    """
    model = model or CHAT_MODEL
    try:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        
        response_data = response.json()
        result = response_data.get("response")
        if result:
            print(f"✅ AI yanıtı alındı (uzunluk: {len(result)} karakter)")
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama completion hatası: {e}")
        return None


def check_ollama_health():
    """Ollama'nın çalışıp çalışmadığını kontrol eder."""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        response.raise_for_status()
        models = [m["name"] for m in response.json().get("models", [])]
        print(f"✅ Ollama çalışıyor. Mevcut modeller: {models}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama bağlantı hatası: {e}")
        return False
