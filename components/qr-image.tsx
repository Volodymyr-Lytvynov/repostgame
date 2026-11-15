"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({ value, className }: { value: string; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let stop = false;
    void QRCode.toDataURL(value, {
      margin: 1,
      width: 420,
      color: { dark: "#14110e", light: "#ffffff" },
    }).then((url) => {
      if (!stop) setSrc(url);
    });
    return () => {
      stop = true;
    };
  }, [value]);
  if (!src) return <div className={`animate-pulse rounded-2xl bg-white/10 ${className ?? "size-48"}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="QR-код, чтобы войти в комнату" className={`rounded-2xl bg-white p-2 ${className ?? "size-48"}`} />
  );
}
