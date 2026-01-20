import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Theme presets with bundled gradient/solid backgrounds and accent colors
export const THEME_PRESETS = [
  // Solid themes first - Classic is default
  {
    name: "Classic",
    type: "solid" as const,
    background: "#ffffff",
    accent: { hex: "#1f2937", rgb: "31 41 55" }, // gray-800 for high contrast
  },
  {
    name: "Light Gray",
    type: "solid" as const,
    background: "#f8fafc",
    accent: { hex: "#334155", rgb: "51 65 85" }, // slate-700
  },
  {
    name: "Dark",
    type: "solid" as const,
    background: "#1e293b",
    accent: { hex: "#e2e8f0", rgb: "226 232 240" }, // slate-200 for contrast on dark
    isDark: true,
  },
  {
    name: "Pure Black",
    type: "solid" as const,
    background: "#0f172a",
    accent: { hex: "#f1f5f9", rgb: "241 245 249" }, // slate-100 for max contrast
    isDark: true,
  },
  // Gradient themes - using darker accent colors for better contrast
  {
    name: "Lavender",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #fafafa 0%, #ede9fe 20%, #ddd6fe 40%, #c4b5fd 60%, #a78bfa 80%, #8b5cf6 100%)",
    accent: { hex: "#5b21b6", rgb: "91 33 182" }, // violet-800 for better contrast
  },
  {
    name: "Sunset",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #fafafa 0%, #fee2e2 20%, #fecaca 40%, #fca5a5 60%, #f87171 80%, #ef4444 100%)",
    accent: { hex: "#b91c1c", rgb: "185 28 28" }, // red-700 for better contrast
  },
  {
    name: "Ocean",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #fafafa 0%, #e0f2fe 20%, #bae6fd 40%, #7dd3fc 60%, #38bdf8 80%, #0ea5e9 100%)",
    accent: { hex: "#0369a1", rgb: "3 105 161" }, // sky-700 for better contrast
  },
  {
    name: "Forest",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #fafafa 0%, #dcfce7 20%, #bbf7d0 40%, #86efac 60%, #4ade80 80%, #22c55e 100%)",
    accent: { hex: "#15803d", rgb: "21 128 61" }, // green-700 for better contrast
  },
  {
    name: "Midnight",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 20%, #3730a3 40%, #4338ca 60%, #4f46e5 80%, #6366f1 100%)",
    accent: { hex: "#c7d2fe", rgb: "199 210 254" }, // indigo-200 for contrast on dark
    isDark: true,
  },
  {
    name: "Warm",
    type: "gradient" as const,
    background: "linear-gradient(135deg, #fafafa 0%, #fef9e7 20%, #fef3c7 40%, #fde68a 60%, #fcd34d 80%, #fbbf24 100%)",
    accent: { hex: "#b45309", rgb: "180 83 9" }, // amber-700 for better contrast
  },
];

interface ThemeContextType {
  themeIndex: number;
  theme: typeof THEME_PRESETS[0];
  setTheme: (index: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "reciprocal-theme";

function getStoredTheme(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const index = parseInt(stored, 10);
      if (index >= 0 && index < THEME_PRESETS.length) {
        return index;
      }
    }
  } catch (e) {
    console.error("Failed to load theme from localStorage:", e);
  }
  return 0;
}

function storeTheme(index: number) {
  try {
    localStorage.setItem(STORAGE_KEY, index.toString());
  } catch (e) {
    console.error("Failed to save theme to localStorage:", e);
  }
}

function applyThemeToDOM(index: number) {
  const theme = THEME_PRESETS[index] || THEME_PRESETS[0];

  // Apply background to body
  document.body.style.background = theme.background;

  // Apply accent color as CSS variables (with RGB for opacity support)
  document.documentElement.style.setProperty("--color-primary", theme.accent.hex);
  document.documentElement.style.setProperty("--color-primary-rgb", theme.accent.rgb);

  // Set dark mode class for text color adjustments
  if (theme.isDark) {
    document.documentElement.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(() => getStoredTheme());

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyThemeToDOM(themeIndex);
  }, [themeIndex]);

  const setTheme = (index: number) => {
    setThemeIndex(index);
    storeTheme(index);
  };

  const value: ThemeContextType = {
    themeIndex,
    theme: THEME_PRESETS[themeIndex] || THEME_PRESETS[0],
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
