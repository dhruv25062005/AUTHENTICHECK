from io import BytesIO

from PIL import Image, ImageStat, UnidentifiedImageError


async def analyze(file):
    data = await file.read()
    try:
        image = Image.open(BytesIO(data)).convert("RGB")
    except UnidentifiedImageError:
        return {
            "modelVersion": "quality-baseline-0.2",
            "status": "error",
            "message": "The uploaded file is not a valid image.",
            "signals": {"similarity": None, "anomaly": None},
        }

    width, height = image.size
    stat = ImageStat.Stat(image)
    brightness = sum(stat.mean) / (3 * 255)
    contrast = sum(stat.stddev) / (3 * 255)
    resolution_score = min(1.0, (width * height) / (1280 * 1280))
    exposure_score = max(0.0, 1.0 - abs(brightness - 0.5) * 1.6)
    quality = max(0.0, min(1.0, 0.45 * resolution_score + 0.35 * contrast + 0.20 * exposure_score))

    return {
        "modelVersion": "quality-baseline-0.2",
        "status": "ok",
        "message": "Image-quality baseline calculated; no authenticity classification was performed.",
        "signals": {
            "similarity": None,
            "anomaly": round(1.0 - quality, 4),
            "qualityScore": round(quality, 4),
            "width": width,
            "height": height,
        },
        "bytesReceived": len(data),
    }
