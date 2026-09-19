from datetime import datetime, timezone
from fastapi import FastAPI, File, UploadFile, HTTPException

app=FastAPI(title="AuthentiCheck AI Service",version="0.1.0")

@app.get("/health")
def health():
    return {"service":"authenticheck-ai","status":"ok","version":"0.1.0","timestamp":datetime.now(timezone.utc).isoformat()}

@app.post("/api/v1/image/analyze")
async def analyze_image(file: UploadFile=File(...)):
    allowed={"image/jpeg","image/png","image/webp"}
    if file.content_type not in allowed: raise HTTPException(400,"Unsupported image type")
    data=await file.read()
    if len(data)>10*1024*1024: raise HTTPException(413,"Image exceeds 10MB limit")
    return {
        "modelVersion":"baseline-0.1",
        "status":"NOT_READY",
        "message":"AI inference pipeline is scaffolded; trained model and reference embeddings will be enabled in the next stage.",
        "signals":{"similarity":None,"anomaly":None},
        "bytesReceived":len(data)
    }
