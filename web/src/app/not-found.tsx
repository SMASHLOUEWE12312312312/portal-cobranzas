import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="card max-w-md w-full text-center">
                <div className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">
                    404
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Página no encontrada
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    La página que busca no existe o fue movida.
                </p>
                <Link href="/dashboard" className="btn btn-primary">
                    Ir al Dashboard
                </Link>
            </div>
        </div>
    );
}
