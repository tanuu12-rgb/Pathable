import { useState, useEffect } from 'react';

export type ThemeName = 'standard' | 'high-contrast' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'monochrome';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('pathable-theme') as ThemeName;
    return saved || 'standard';
  });

  useEffect(() => {
    localStorage.setItem('pathable-theme', theme);
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return { theme, setTheme };
}
