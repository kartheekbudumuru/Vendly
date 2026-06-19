import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";

interface QRCodeCardProps {
  customerId: string;
  customerName: string;
  qrToken: string;
  /** Size in px. Defaults to 200 */
  size?: number;
  /** Whether to show the download button. Defaults to true */
  showDownload?: boolean;
}

export default function QRCodeCard({
  customerName,
  qrToken,
  size = 200,
  showDownload = true,
}: QRCodeCardProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Encode the qr_token as the QR payload — the scanner looks this up in Supabase
  const qrValue = `VENDLY_CUSTOMER:${qrToken}`;

  function handleDownload() {
    if (!svgRef.current) return;

    // Serialize SVG → canvas → PNG download
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);

    const padding = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2 + 56; // extra for label
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#0f0e2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // White QR area
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(padding - 12, padding - 12, size + 24, size + 24, 12);
    ctx.fill();

    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(url);

      // Customer name label
      ctx.fillStyle = "#f7c948";
      ctx.font = "bold 16px Poppins, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(customerName, canvas.width / 2, size + padding + 36);

      // Vendly brand
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "12px Poppins, sans-serif";
      ctx.fillText("Powered by Vendly", canvas.width / 2, size + padding + 56);

      const link = document.createElement("a");
      link.download = `${customerName.replace(/\s+/g, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = url;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Container */}
      <div className="p-4 bg-white rounded-2xl shadow-lg">
        <QRCodeSVG
          ref={svgRef as any}
          value={qrValue}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: "", // Could add logo here
            x: undefined,
            y: undefined,
            height: 0,
            width: 0,
            excavate: false,
          }}
          style={{ display: "block" }}
        />
      </div>

      {/* Customer name */}
      <div className="text-center">
        <div className="font-bold text-white text-sm">{customerName}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center">
          <QrCode className="w-3 h-3" />
          Loyalty QR Code
        </div>
      </div>

      {/* Download button */}
      {showDownload && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-gold hover:text-gold text-sm font-semibold text-white transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download QR
        </button>
      )}
    </div>
  );
}
