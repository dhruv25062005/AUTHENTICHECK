import QRCode from "qrcode";

export async function createVerificationQr(verificationUrl: string): Promise<string> {
  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512
  });
}
