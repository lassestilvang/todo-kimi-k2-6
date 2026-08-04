"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Check,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ColorBlindMode = "normal" | "deuteranopia" | "protanopia" | "tritanopia" | "achromatopsia";

interface ColorBlindThemesProps {
  className?: string;
  onChange?: (mode: ColorBlindMode) => void;
}

const COLOR_PALETTES: Record<ColorBlindMode, { name: string; colors: string[] }> = {
  normal: {
    name: "Default",
    colors: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#6b7280"],
  },
  deuteranopia: {
    name: "Deuteranopia (Red-Green)",
    colors: ["#e11d48", "#dc2626", "#d97706", "#059669", "#7c3aed", "#6b7280"],
  },
  protanopia: {
    name: "Protanopia (Red-Green)",
    colors: ["#7c2d12", "#dc2626", "#d97706", "#059669", "#7c3aed", "#6b7280"],
  },
  tritanopia: {
    name: "Tritanopia (Blue-Yellow)",
    colors: ["#1e40af", "#dc2626", "#059669", "#7c3aed", "#d97706", "#6b7280"],
  },
  achromatopsia: {
    name: "Achromatopsia (Monochrome)",
    colors: ["#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"],
  },
};

export function ColorBlindThemes({ className, onChange }: ColorBlindThemesProps) {
  const [currentMode, setCurrentMode] = useState<ColorBlindMode>("normal");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem("color-blind-mode");
    if (saved && (saved as ColorBlindMode) in COLOR_PALETTES) {
      setCurrentMode(saved as ColorBlindMode);
    }
  }, []);

  const handleModeChange = (mode: ColorBlindMode) => {
    setCurrentMode(mode);
    localStorage.setItem("color-blind-mode", mode);

    // Apply CSS variables
    const palette = COLOR_PALETTES[mode];
    if (mode !== "normal") {
      document.documentElement.style.setProperty("--chart-1", palette.colors[0]);
      document.documentElement.style.setProperty("--chart-2", palette.colors[1]);
      document.documentElement.style.setProperty("--chart-3", palette.colors[2]);
      document.documentElement.style.setProperty("--chart-4", palette.colors[3]);
      document.documentElement.style.setProperty("--chart-5", palette.colors[4]);
      document.documentElement.style.setProperty("--chart-6", palette.colors[5]);
    } else {
      // Reset to defaults
      document.documentElement.style.removeProperty("--chart-1");
      document.documentElement.style.removeProperty("--chart-2");
      document.documentElement.style.removeProperty("--chart-3");
      document.documentElement.style.removeProperty("--chart-4");
      document.documentElement.style.removeProperty("--chart-5");
      document.documentElement.style.removeProperty("--chart-6");
    }

    onChange?.(mode);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Color Theme</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Accessibility Theme</DropdownMenuLabel>

        {Object.entries(COLOR_PALETTES).map(([mode, palette]) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => handleModeChange(mode as ColorBlindMode)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  {palette.colors.slice(0, 3).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span>{palette.name}</span>
              </div>
              {currentMode === mode && <Check className="h-4 w-4 ml-auto" />}
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            // Cycle through modes
            const modes = Object.keys(COLOR_PALETTES) as ColorBlindMode[];
            const currentIndex = modes.indexOf(currentMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            handleModeChange(nextMode);
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>Cycle Next Theme</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}