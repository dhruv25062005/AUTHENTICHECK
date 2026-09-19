from datetime import datetime, timezone
from fastapi import FastAPI

app = FastAPI(
    title="AuthentiCheck AI Service",
    version="0.1.0",
    description="AI inference boundary for product image verification."
)

@app.get("/health")
def health():
    return {
        "service": "authenticheck-ai",
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/v1")
def root():
    return {
        "name": "AuthentiCheck AI Service",
        "status": "foundation"
    }
