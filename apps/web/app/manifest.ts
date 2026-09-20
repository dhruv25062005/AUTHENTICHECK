import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AuthentiCheck | Anti-Counterfeit Verification Protocol",
    short_name: "AuthentiCheck",
    description: "Verify genuine product authenticity, detect duplicate QR clones, and audit seller authorization offline and online.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060d17",
    theme_color: "#060d17",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
