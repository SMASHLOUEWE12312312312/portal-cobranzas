'use client';

import { useTheme } from './ThemeProvider';

/**
 * Theme Toggle Button
 * 
 * Switches between light and dark mode with smooth animation
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
        >
            <span className="text-xl transition-transform duration-300 block">
                {theme === 'light' ? '🌙' : '☀️'}
            </span>
        </button>
    );
}
