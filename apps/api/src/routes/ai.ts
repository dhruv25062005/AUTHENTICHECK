import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const schema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  image: z.string().max(15_000_000).optional(),
  notes: z.string().trim().max(2000).optional()
});

router.post("/inspect", rateLimit({ windowMs: 60_000, max: 12, keyPrefix: "ai-inspect" }), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid inspection request", details: parsed.error.flatten() });
    return;
  }

  if (!parsed.data.image?.startsWith("data:image/")) {
    res.status(400).json({ error: "Visual inspection requires an uploaded product image." });
    return;
  }

  try {
    const match = parsed.data.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Only JPEG, PNG, and WebP images are supported." });
      return;
    }

    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: "Image exceeds 10MB limit" });
      return;
    }

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: match[1] }), "inspection-image");

    const upstream = await fetch(env.AI_SERVICE_URL + "/api/v1/image/analyze", {
      method: "POST",
      body: form
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      res.status(502).json({ error: "AI service rejected the image" });
      return;
    }

    res.json({
      success: data.status === "ok",
      status: data.status,
      message: data.message,
      signals: data.signals ?? { similarity: null, anomaly: null },
      modelVersion: data.modelVersion
    });
  } catch (error) {
    console.error("AI service error:", error);
    res.status(503).json({
      success: false,
      status: "UNAVAILABLE",
      message: "Visual AI service is currently unavailable. Registry verification remains independent."
    });
  }
});

export default router;
