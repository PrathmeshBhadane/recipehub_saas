import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type ThemeType = "light" | "dark";
export type ColorThemeType = "violet" | "emerald" | "amber" | "rose" | "blue" | "instagram";

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  colorTheme: ColorThemeType;
  setColorTheme: (color: ColorThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [colorTheme, setColorThemeState] = useState<ColorThemeType>("violet");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeType | null;
    const savedColorTheme = localStorage.getItem("colorTheme") as ColorThemeType | null;
    
    const finalTheme = savedTheme || "dark";
    const finalColorTheme = savedColorTheme || "violet";

    setTheme(finalTheme);
    setColorThemeState(finalColorTheme);

    document.documentElement.setAttribute("data-theme", finalTheme);
    document.documentElement.setAttribute("data-color-theme", finalColorTheme);
    document.body.className = `${finalTheme} theme-${finalColorTheme}`;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.body.className = `${nextTheme} theme-${colorTheme}`;
  };

  const setColorTheme = (nextColorTheme: ColorThemeType) => {
    setColorThemeState(nextColorTheme);
    localStorage.setItem("colorTheme", nextColorTheme);
    document.documentElement.setAttribute("data-color-theme", nextColorTheme);
    document.body.className = `${theme} theme-${nextColorTheme}`;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
