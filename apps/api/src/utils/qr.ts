import QRCode from "qrcode";

export async function createVerificationQr(serial: string): Promise<string> {
  const baseUrl = process.env.PUBLIC_VERIFY_URL ?? "http://localhost:3000/verify";
  return QRCode.toDataURL(`${baseUrl}/${encodeURIComponent(serial)}`, {
    errorCorrectionLevel: "M", margin: 2, width: 512
  });
}
