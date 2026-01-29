'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
    eeccToday: number;
    eeccWeek: number;
    mailSent24h: number;
    mailQueued: number;
    errors24h: number;
}

interface QueueHealth {
    status: 'OK' | 'WARNING' | 'ERROR';
    pending: number;
    processing: number;
    failed24h: number;
    oldestPending?: string;
}

/**
 * Dashboard Page
 * 
 * Main entry point showing:
 * - Quick stats
 * - Queue health
 * - Quick action cards
 * - Power BI embed (collapsible)
 */
// Power BI Embed URL (from GAS config)
const PBI_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNTJmNjA0ZmQtOGU4Yi00Nzk2LWIzOWMtM2NmMTM4N2Y5ZDEzIiwidCI6IjMyMDliNTBiLWI3OWItNDNkYy05ZmM0LThkNDJjNDA2ZGQ2MSIsImMiOjR9';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [pbiExpanded, setPbiExpanded] = useState(false);
    const [pbiLoaded, setPbiLoaded] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            const [statsRes, queueRes] = await Promise.all([
                fetch('/api/dashboard/stats'),
                fetch('/api/mail/queue-health'),
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.ok) setStats(statsData.data);
            }

            if (queueRes.ok) {
                const queueData = await queueRes.json();
                if (queueData.ok) setQueueHealth(queueData.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    const quickActions = [
        { href: '/actualizar', icon: '📤', title: 'Actualizar Base', desc: 'Sube archivos Excel/CSV' },
        { href: '/generar', icon: '📄', title: 'Generar EECC', desc: 'Crea estados de cuenta' },
        { href: '/enviar', icon: '📧', title: 'Enviar Correos', desc: 'Envío masivo de EECC' },
        { href: '/bitacora', icon: '📝', title: 'Bitácora', desc: 'Gestiona seguimientos' },
        { href: '/conciliacion', icon: '🔄', title: 'Conciliación', desc: 'Cruce EECC vs BD Sisnet' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Resumen general del sistema de cobranzas
                </p>
            </div>

            {/* Power BI Section (Collapsible) */}
            <section className="card">
                <button
                    onClick={() => setPbiExpanded(!pbiExpanded)}
                    className="w-full flex items-center justify-between text-left"
                >
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            📊 Dashboard Analítico
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Visualiza métricas y análisis de cobranzas en tiempo real
                        </p>
                    </div>
                    <span className={`text-2xl transition-transform duration-200 ${pbiExpanded ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>
                
                {pbiExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ minHeight: '600px', height: '70vh' }}>
                            {!pbiLoaded && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-red-600 mb-4"></div>
                                    <p className="text-gray-500">Cargando Power BI Dashboard...</p>
                                </div>
                            )}
                            <iframe
                                src={PBI_URL}
                                className={`w-full h-full border-0 transition-opacity duration-300 ${pbiLoaded ? 'opacity-100' : 'opacity-0'}`}
                                style={{ minHeight: '600px', height: '70vh' }}
                                allowFullScreen
                                onLoad={() => setPbiLoaded(true)}
                                title="Power BI Dashboard"
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Stats Grid */}
            <section className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        📊 Métricas del Sistema
                    </h3>
                    <button
                        onClick={loadDashboardData}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        🔄 Actualizar
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton h-20 rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatCard
                            label="EECC Hoy"
                            value={stats?.eeccToday ?? '-'}
                            color="text-red-600"
                        />
                        <StatCard
                            label="EECC Semana"
                            value={stats?.eeccWeek ?? '-'}
                            color="text-red-600"
                        />
                        <StatCard
                            label="Enviados 24h"
                            value={stats?.mailSent24h ?? '-'}
                            color="text-green-600"
                        />
                        <StatCard
                            label="En Cola"
                            value={stats?.mailQueued ?? '-'}
                            color="text-orange-600"
                        />
                        <StatCard
                            label="Errores 24h"
                            value={stats?.errors24h ?? '-'}
                            color="text-red-700"
                        />
                    </div>
                )}
            </section>

            {/* Queue Health Panel */}
            {queueHealth && (
                <section className="card">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">
                            {queueHealth.status === 'OK' ? '✅' : queueHealth.status === 'WARNING' ? '⚠️' : '❌'}
                        </span>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Estado de Cola de Correos
                            </h3>
                            <span className={`badge ${
                                queueHealth.status === 'OK' ? 'badge-success' :
                                queueHealth.status === 'WARNING' ? 'badge-warning' : 'badge-error'
                            }`}>
                                {queueHealth.status}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Pendientes:</span>
                            <span className="ml-2 font-medium">{queueHealth.pending}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Procesando:</span>
                            <span className="ml-2 font-medium">{queueHealth.processing}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Fallidos 24h:</span>
                            <span className="ml-2 font-medium">{queueHealth.failed24h}</span>
                        </div>
                        {queueHealth.oldestPending && (
                            <div>
                                <span className="text-gray-500">Más antiguo:</span>
                                <span className="ml-2 font-medium">{queueHealth.oldestPending}</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Quick Actions Grid */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Accesos Directos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="card hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
                        >
                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                                {action.icon}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {action.title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {action.desc}
                            </p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}
