/**
 * TotpQrCode.tsx - render an otpauth:// URI as a scannable QR (client-side).
 * @package @vxture/accounts
 *
 * The QR is generated locally with `qrcode` so the TOTP secret never leaves the
 * browser via a third-party image service. Falls back silently (renders nothing)
 * if generation fails — the manual secret entry is always shown alongside.
 */
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface TotpQrCodeProps {
  readonly value: string;
  readonly size?: number;
}

export function TotpQrCode({ value, size = 192 }: TotpQrCodeProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="vx-totp-qr"
      src={dataUrl}
      alt="TOTP 二维码"
      width={size}
      height={size}
    />
  );
}
