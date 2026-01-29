'use client';

import { useState, useEffect, useRef } from 'react';

interface Compromiso {
    asegurado: string;
    fechaCompromiso: string;
    monto?: number;
    estado: string;
    diasRestantes: number;
}

/**
 * Notifications Panel Component
 * 
 * Shows payment commitment reminders similar to GAS portal
 */
export default function NotificationsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [compromisos, setCompromisos] = useState<Compromiso[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Load compromisos when panel opens
    useEffect(() => {
        if (isOpen && compromisos.length === 0 && !loading) {
            loadCompromisos();
        }
    }, [isOpen]);

    async function loadCompromisos() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/bitacora/compromisos');
            const data = await res.json();

            if (data.ok) {
                setCompromisos(data.data || []);
            } else {
                setError(data.error?.message || 'Error al cargar');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    }

    // Count urgent compromisos (today or overdue)
    const urgentCount = compromisos.filter(c => c.diasRestantes <= 0).length;
    const totalCount = compromisos.length;

    function getUrgencyClass(dias: number) {
        if (dias < 0) return 'bg-red-100 text-red-800 border-red-200';
        if (dias === 0) return 'bg-orange-100 text-orange-800 border-orange-200';
        if (dias <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }

    function getUrgencyLabel(dias: number) {
        if (dias < 0) return `Vencido (${Math.abs(dias)} días)`;
        if (dias === 0) return 'Vence HOY';
        if (dias === 1) return 'Vence mañana';
        return `En ${dias} días`;
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                title="Notificaciones de compromisos de pago"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className="text-xl">🔔</span>
                {totalCount > 0 && (
                    <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1 ${
                        urgentCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-white'
                    }`}>
                        {totalCount > 99 ? '99+' : totalCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            🔔 Recordatorios de Compromisos
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Body */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-red-600 mb-3"></div>
                                <p className="text-sm text-gray-500">Cargando notificaciones...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 text-center">
                                <p className="text-red-500 text-sm mb-2">{error}</p>
                                <button
                                    onClick={loadCompromisos}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    Reintentar
                                </button>
                            </div>
                        ) : compromisos.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-4xl mb-3 block">✅</span>
                                <p className="text-gray-500 text-sm">
                                    No hay compromisos pendientes
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {compromisos.map((comp, i) => (
                                    <div
                                        key={i}
                                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                            comp.diasRestantes <= 0 ? 'bg-red-50 dark:bg-red-950/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                    {comp.asegurado}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    📅 {comp.fechaCompromiso}
                                                    {comp.monto && ` • S/ ${comp.monto.toLocaleString()}`}
                                                </p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${getUrgencyClass(comp.diasRestantes)}`}>
                                                {getUrgencyLabel(comp.diasRestantes)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {compromisos.length > 0 && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <a
                                href="/bitacora"
                                className="block text-center text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Ver todos en Bitácora →
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
