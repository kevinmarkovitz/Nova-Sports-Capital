// src/hooks/useTheme.js
import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Get theme from local storage or default to 'dark'
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    // This effect runs whenever the theme changes
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
