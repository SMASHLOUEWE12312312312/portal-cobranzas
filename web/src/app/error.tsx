'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="card max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Algo salió mal
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    Ocurrió un error inesperado. Por favor intente nuevamente.
                </p>
                {error.digest && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 font-mono">
                        Ref: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="btn btn-primary"
                >
                    Reintentar
                </button>
            </div>
        </div>
    );
}
