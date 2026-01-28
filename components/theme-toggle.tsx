"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="gap-2"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span className="text-xs font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
