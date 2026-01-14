import Link from "next/link";

/**
 * Landing Page
 * 
 * For unauthenticated users, this shows a login prompt.
 * Authenticated users will be redirected by middleware (COMMIT 3).
 */
export default function HomePage() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950"
    >
      <div className="card max-w-md w-full mx-4 text-center page-transition">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">TP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Portal de Cobranzas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Transperuana Corredores de Seguros S.A.
          </p>
        </div>

        {/* Login Prompt */}
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Bienvenido al sistema de gestión de cobranzas y Estados de Cuenta.
          </p>

          <Link
            href="/login"
            className="btn btn-primary w-full"
          >
            Iniciar Sesión
          </Link>
        </div>

        {/* Version / Deployment Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Versión 2.0.0 — Next.js + Vercel BFF
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            © 2026 Transperuana
          </p>
        </div>
      </div>
    </main>
  );
}
