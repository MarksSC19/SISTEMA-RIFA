import QRCode from 'qrcode';

export function getTicketVerificationUrl(verificationCode: string, ticketNumber?: number): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${cleanPath}?verify=${encodeURIComponent(verificationCode)}`;
  }
  return `https://rifas.pe/verify?code=${encodeURIComponent(verificationCode)}`;
}

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0F1115',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High error correction level for reliable camera scanning
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

export function generateVerificationCode(ticketNum: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RF-${ticketNum}${rand}`;
}
