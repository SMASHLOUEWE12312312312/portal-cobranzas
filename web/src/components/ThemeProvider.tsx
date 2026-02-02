'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'portal-theme';

/**
 * ThemeProvider Component
 * 
 * Manages light/dark theme with:
 * - Default: light mode
 * - Persistence in localStorage
 * - No flash on page load (script in head)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage or default to 'light'
    useEffect(() => {
        const stored = localStorage.getItem(THEME_KEY) as Theme | null;
        const initialTheme = stored || 'light';
        setThemeState(initialTheme);
        applyTheme(initialTheme);
        setMounted(true);
    }, []);

    // Apply theme to document
    function applyTheme(newTheme: Theme) {
        const root = document.documentElement;
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }

    // Set theme and persist
    function setTheme(newTheme: Theme) {
        setThemeState(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    }

    // Toggle between light and dark
    function toggleTheme() {
        setTheme(theme === 'light' ? 'dark' : 'light');
    }

    // Prevent flash by not rendering until mounted
    if (!mounted) {
        return (
            <div style={{ visibility: 'hidden' }}>
                {children}
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
