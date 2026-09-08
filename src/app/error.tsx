"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: 20, color: "red", background: "black", height: "100%", width: "100%" }}>
      <h2>Something went wrong!</h2>
      <p style={{ wordBreak: "break-all" }}>{error.message}</p>
      <p style={{ fontSize: "10px", wordBreak: "break-all", marginTop: 10 }}>{error.stack}</p>
      <button onClick={() => reset()} style={{ marginTop: 20, padding: 10, background: "white", color: "black" }}>Try again</button>
    </div>
  );
}
