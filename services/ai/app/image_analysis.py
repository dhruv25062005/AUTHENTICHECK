from fastapi import UploadFile

async def analyze(file: UploadFile):
    data = await file.read()
    return {
        "modelVersion": "baseline-0.1",
        "status": "NOT_READY",
        "message": "Inference boundary is ready for the trained vision model.",
        "signals": {"similarity": None, "anomaly": None},
        "bytesReceived": len(data)
    }
