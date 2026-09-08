"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isOnboarded = useAuthStore(s => s.isOnboarded);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isOnboarded) {
      router.replace("/wallet");
    } else {
      router.replace("/welcome");
    }
  }, [mounted, isOnboarded, router]);

  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-primary)",
    }}>
      <div className="spinner" style={{
        width: 40,
        height: 40,
        border: "3px solid var(--border-secondary)",
        borderTopColor: "var(--brand-primary)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}
