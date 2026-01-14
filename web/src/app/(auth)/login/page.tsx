'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Login Form Component (wrapped in Suspense)
 */
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('from') || '/bitacora';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (!data.ok) {
                    setError(data.error?.message || 'Error de autenticación');
                    return;
                }

                // Redirect to intended destination
                router.push(redirectTo);
                router.refresh();

            } catch {
                setError('Error de conexión. Intente nuevamente.');
            }
        });
    }

    return (
        <>
            {/* Error Alert */}
            {error && (
                <div
                    role="alert"
                    className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div>
                    <label
                        htmlFor="username"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                        Usuario
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isPending}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Ingrese su usuario"
                    />
                </div>

                {/* Password Field */}
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                        Contraseña
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isPending}
                            className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Ingrese su contraseña"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary w-full text-base py-3"
                >
                    {isPending ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Ingresando...</span>
                        </div>
                    ) : (
                        'Iniciar Sesión'
                    )}
                </button>
            </form>
        </>
    );
}

/**
 * Login Form Loading Fallback
 */
function LoginFormSkeleton() {
    return (
        <div className="space-y-6">
            <div>
                <div className="h-5 w-16 skeleton mb-2" />
                <div className="h-12 skeleton rounded-lg" />
            </div>
            <div>
                <div className="h-5 w-20 skeleton mb-2" />
                <div className="h-12 skeleton rounded-lg" />
            </div>
            <div className="h-12 skeleton rounded-lg" />
        </div>
    );
}

/**
 * Login Page
 * Premium design with accessibility (WCAG 2.2 AA)
 */
export default function LoginPage() {
    return (
        <main
            id="main-content"
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-black px-4"
        >
            <div className="card max-w-md w-full page-transition">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
                        <span className="text-white text-2xl font-bold">TP</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Iniciar Sesión
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Portal de Cobranzas
                    </p>
                </div>

                {/* Form with Suspense boundary for useSearchParams */}
                <Suspense fallback={<LoginFormSkeleton />}>
                    <LoginForm />
                </Suspense>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        Transperuana Corredores de Seguros S.A.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        © 2026 — Portal v2.0 BFF
                    </p>
                </div>
            </div>
        </main>
    );
}
