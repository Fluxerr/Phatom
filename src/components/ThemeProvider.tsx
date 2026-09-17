"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Also update the meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#08080C" : "#F8F9FC");
    }
  }, [theme]);

  return <>{children}</>;
}
