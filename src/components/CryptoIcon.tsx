"use client";

import { useState } from "react";

interface CryptoIconProps {
  src?: string;
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
}

// Map common symbols to vibrant brand gradient colors
const SYMBOL_COLORS: Record<string, string> = {
  btc: "linear-gradient(135deg, #f7931a, #ffb347)",
  eth: "linear-gradient(135deg, #627eea, #8b9fe8)",
  sol: "linear-gradient(135deg, #9945ff, #14f195)",
  bnb: "linear-gradient(135deg, #f3ba2f, #fcd535)",
  xrp: "linear-gradient(135deg, #23292f, #34404b)",
  ada: "linear-gradient(135deg, #0033ad, #3366ff)",
  doge: "linear-gradient(135deg, #c2a633, #e1c249)",
  dot: "linear-gradient(135deg, #e6007a, #ff409f)",
  avax: "linear-gradient(135deg, #e84142, #ff6b6c)",
  link: "linear-gradient(135deg, #375bd2, #587bf2)",
  ltc: "linear-gradient(135deg, #345d9d, #5a85c7)",
  pol: "linear-gradient(135deg, #8247e5, #a067ff)",
  trx: "linear-gradient(135deg, #ef0027, #ff3b56)",
};

export default function CryptoIcon({ src, symbol, name, size = 36, className = "" }: CryptoIconProps) {
  const [stage, setStage] = useState<"primary" | "secondary" | "fallback">("primary");

  const cleanSymbol = (symbol || "COIN").toUpperCase();
  const lowerSymbol = cleanSymbol.toLowerCase();

  // Alternative CDN source
  const secondarySrc = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${lowerSymbol}.png`;

  const handlePrimaryError = () => {
    setStage("secondary");
  };

  const handleSecondaryError = () => {
    setStage("fallback");
  };

  if (stage === "fallback") {
    const background = SYMBOL_COLORS[lowerSymbol] || "linear-gradient(135deg, var(--brand-primary), #4f46e5)";
    const fontSize = size <= 24 ? "10px" : size <= 36 ? "12px" : "14px";

    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.5px",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
        title={name || cleanSymbol}
      >
        {cleanSymbol.slice(0, 3)}
      </div>
    );
  }

  const currentSrc = stage === "primary" ? (src || secondarySrc) : secondarySrc;

  return (
    <img
      src={currentSrc}
      alt={name || cleanSymbol}
      width={size}
      height={size}
      className={className}
      onError={stage === "primary" ? handlePrimaryError : handleSecondaryError}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}
