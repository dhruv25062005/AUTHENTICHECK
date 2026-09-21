from datetime import datetime, timezone
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageStat, UnidentifiedImageError

app = FastAPI(title="AuthentiCheck AI Service", version="0.2.0")

ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024


@app.get("/health")
def health():
    return {
        "service": "authenticheck-ai",
        "status": "ok",
        "version": "0.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/v1/image/analyze")
async def analyze_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Unsupported image type")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image exceeds 10MB limit")

    try:
        image = Image.open(BytesIO(data)).convert("RGB")
        width, height = image.size
        if width < 160 or height < 160:
            quality = 0.35
            quality_note = "Image resolution is low for reliable visual inspection."
        else:
            stat = ImageStat.Stat(image)
            brightness = sum(stat.mean) / (3 * 255)
            contrast = sum(stat.stddev) / (3 * 255)
            resolution_score = min(1.0, (width * height) / (1280 * 1280))
            exposure_score = max(0.0, 1.0 - abs(brightness - 0.5) * 1.6)
            quality = max(0.0, min(1.0, 0.45 * resolution_score + 0.35 * contrast + 0.20 * exposure_score))
            quality_note = "Image quality is suitable for a future reference-model comparison."

        # This is an image-quality baseline, not counterfeit classification.
        return {
            "modelVersion": "quality-baseline-0.2",
            "status": "ok",
            "message": quality_note,
            "signals": {
                "similarity": None,
                "anomaly": round(1.0 - quality, 4),
                "qualityScore": round(quality, 4),
                "width": width,
                "height": height,
            },
            "bytesReceived": len(data),
        }
    except UnidentifiedImageError as exc:
        raise HTTPException(400, "The uploaded file is not a valid image") from exc
