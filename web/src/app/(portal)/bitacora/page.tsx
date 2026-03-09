'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface Ciclo {
    idCiclo: string;
    asegurado: string;
    estado: string;
    diasSinGestion: number;
    vencidoPen: number;
    vencidoUsd: number;
    responsable: string;
    fechaUltimaGestion: string;
    totalGestiones: number;
    fechaCompromiso?: string;
}

interface Gestion {
    fecha: string;
    tipo: string;
    estado: string;
    comentario: string;
    responsable: string;
}

interface BitacoraFilters {
    estado: string;
    responsable: string;
    diasMinimos: string;
    search: string;
}

interface KPIs {
    hoy: number;
    dias1a3: number;
    dias4a7: number;
    vencidos: number;
    aging60: number;
}

const ESTADOS = [
    { value: '', label: 'Todos los estados', icon: '' },
    { value: 'SIN_RESPUESTA', label: 'Sin Respuesta', icon: '❌', color: 'bg-gray-100 text-gray-700' },
    { value: 'EN_SEGUIMIENTO', label: 'En Seguimiento', icon: '👁️', color: 'bg-blue-100 text-blue-700' },
    { value: 'COMPROMISO_PAGO', label: 'Compromiso de Pago', icon: '🤝', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'REPROGRAMADO', label: 'Reprogramado', icon: '📅', color: 'bg-orange-100 text-orange-700' },
    { value: 'DERIVADO_COMERCIAL', label: 'Derivado Comercial', icon: '🔀', color: 'bg-purple-100 text-purple-700' },
    { value: 'DERIVADO_RRHH', label: 'Derivado RRHH', icon: '🔀', color: 'bg-purple-100 text-purple-700' },
    { value: 'DERIVADO_RIESGOS_GENERALES', label: 'Derivado Riesgos', icon: '🔀', color: 'bg-purple-100 text-purple-700' },
    { value: 'NO_CONTACTABLE', label: 'No Contactable', icon: '📵', color: 'bg-gray-200 text-gray-700' },
    { value: 'NO_COBRABLE', label: 'No Cobrable', icon: '🚫', color: 'bg-red-100 text-red-700' },
    { value: 'CERRADO_PAGADO', label: 'Cerrado - Pagado', icon: '✅', color: 'bg-green-100 text-green-700' },
];

const TIPOS_GESTION = [
    { value: 'LLAMADA', label: '📞 Llamada' },
    { value: 'WHATSAPP', label: '💬 WhatsApp' },
    { value: 'CORREO_INDIVIDUAL', label: '📧 Correo' },
    { value: 'REUNION', label: '🤝 Reunión' },
    { value: 'OTRO', label: '📝 Otro' },
];

/**
 * Bitácora Page - Paridad 1:1 con Apps Script
 */
export default function BitacoraPage() {
    const [activeTab, setActiveTab] = useState<'estado' | 'registrar'>('estado');
    const [ciclos, setCiclos] = useState<Ciclo[]>([]);
    const [loading, setLoading] = useState(true);
    const [responsables, setResponsables] = useState<string[]>([]);
    const [asegurados, setAsegurados] = useState<string[]>([]);
    const [filters, setFilters] = useState<BitacoraFilters>({
        estado: '',
        responsable: '',
        diasMinimos: '',
        search: '',
    });
    const [kpis, setKpis] = useState<KPIs>({ hoy: 0, dias1a3: 0, dias4a7: 0, vencidos: 0, aging60: 0 });

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 25;

    // Detail modal
    const [selectedCiclo, setSelectedCiclo] = useState<Ciclo | null>(null);
    const [gestiones, setGestiones] = useState<Gestion[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Nueva gestión form
    const [nuevaGestion, setNuevaGestion] = useState({
        asegurado: '',
        tipo: 'LLAMADA',
        estado: 'EN_SEGUIMIENTO',
        comentario: '',
        fechaCompromiso: '',
        montoCompromiso: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [searchAsegurado, setSearchAsegurado] = useState('');

    useEffect(() => {
        loadBitacora();
        loadResponsables();
        loadAsegurados();
    }, []);

    // Debounce filter changes to avoid rapid API calls
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            loadBitacora();
        }, 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [filters, page]);

    // Calcular KPIs desde los ciclos
    const calculateKPIs = useCallback((data: Ciclo[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newKpis = { hoy: 0, dias1a3: 0, dias4a7: 0, vencidos: 0, aging60: 0 };

        data.forEach((ciclo) => {
            // Compromisos de pago
            if (ciclo.estado === 'COMPROMISO_PAGO' && ciclo.fechaCompromiso) {
                const fechaComp = new Date(ciclo.fechaCompromiso);
                fechaComp.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((fechaComp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) newKpis.hoy++;
                else if (diffDays >= 1 && diffDays <= 3) newKpis.dias1a3++;
                else if (diffDays >= 4 && diffDays <= 7) newKpis.dias4a7++;
                else if (diffDays < 0) newKpis.vencidos++;
            }

            // Aging +60 días
            if (ciclo.diasSinGestion >= 60) newKpis.aging60++;
        });

        setKpis(newKpis);
    }, []);

    async function loadBitacora() {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(filters.estado && { estado: filters.estado }),
                ...(filters.responsable && { responsable: filters.responsable }),
                ...(filters.diasMinimos && { diasMinimos: filters.diasMinimos }),
                ...(filters.search && { search: filters.search }),
            });

            const res = await fetch(`/api/bitacora?${params}`);
            const data = await res.json();

            if (data.ok) {
                const ciclosData = data.data || [];
                setCiclos(ciclosData);
                calculateKPIs(ciclosData);
                if (data.pagination) {
                    setTotal(data.pagination.total || 0);
                    setTotalPages(data.pagination.totalPages || 1);
                }
            }
        } catch (error) {
            console.error('Error loading bitacora:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadResponsables() {
        try {
            const res = await fetch('/api/bitacora/responsables');
            const data = await res.json();
            if (data.ok) {
                setResponsables(data.data || []);
            }
        } catch (error) {
            console.error('Error loading responsables:', error);
        }
    }

    async function loadAsegurados() {
        try {
            const res = await fetch('/api/eecc/asegurados');
            const data = await res.json();
            if (data.ok) {
                setAsegurados(data.data || []);
            }
        } catch (error) {
            console.error('Error loading asegurados:', error);
        }
    }

    async function loadCicloDetail(ciclo: Ciclo) {
        setSelectedCiclo(ciclo);
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/bitacora/${ciclo.idCiclo}`);
            const data = await res.json();
            if (data.ok) {
                setGestiones(data.data || []);
            }
        } catch (error) {
            console.error('Error loading cycle detail:', error);
        } finally {
            setLoadingDetail(false);
        }
    }

    async function handleSubmitGestion(e: React.FormEvent) {
        e.preventDefault();
        if (!nuevaGestion.asegurado || !nuevaGestion.comentario) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/bitacora', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: {
                        asegurado: nuevaGestion.asegurado,
                        tipo: nuevaGestion.tipo,
                        estado: nuevaGestion.estado,
                        comentario: nuevaGestion.comentario,
                        fechaCompromiso: nuevaGestion.fechaCompromiso || undefined,
                        montoCompromiso: nuevaGestion.montoCompromiso ? parseFloat(nuevaGestion.montoCompromiso) : undefined,
                    },
                }),
            });

            const data = await res.json();
            if (data.ok) {
                // Reset form
                setNuevaGestion({
                    asegurado: '',
                    tipo: 'LLAMADA',
                    estado: 'EN_SEGUIMIENTO',
                    comentario: '',
                    fechaCompromiso: '',
                    montoCompromiso: '',
                });
                setSearchAsegurado('');
                // Switch to estado tab and reload
                setActiveTab('estado');
                loadBitacora();
            } else {
                alert(`Error: ${data.error?.message || 'Error desconocido'}`);
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    }

    function applyQuickFilter(tipo: string) {
        switch (tipo) {
            case 'vencidos':
                setFilters(f => ({ ...f, estado: 'COMPROMISO_PAGO' }));
                break;
            case 'sin_respuesta':
                setFilters(f => ({ ...f, estado: 'SIN_RESPUESTA' }));
                break;
            case 'criticos':
                setFilters(f => ({ ...f, diasMinimos: '60' }));
                break;
            case 'hoy':
                // Filtro especial para compromisos hoy (simplificado)
                setFilters(f => ({ ...f, estado: 'COMPROMISO_PAGO' }));
                break;
            default:
                setFilters({ estado: '', responsable: '', diasMinimos: '', search: '' });
        }
        setPage(1);
    }

    function clearFilters() {
        setFilters({ estado: '', responsable: '', diasMinimos: '', search: '' });
        setPage(1);
    }

    async function exportCSV() {
        const headers = ['Asegurado', 'Estado', 'Días Sin Gestión', 'Vencido PEN', 'Vencido USD', 'Responsable', 'Última Gestión'];
        const rows = ciclos.map(c => [
            c.asegurado,
            c.estado,
            c.diasSinGestion,
            c.vencidoPen || 0,
            c.vencidoUsd || 0,
            c.responsable || '',
            c.fechaUltimaGestion || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bitacora_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    function getEstadoBadge(estado: string) {
        const config = ESTADOS.find(e => e.value === estado);
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100'}`}>
                {config?.icon} {config?.label || estado}
            </span>
        );
    }

    function formatCurrency(value: number, currency: 'PEN' | 'USD') {
        if (!value || value === 0) return '-';
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(value);
    }

    const filteredAsegurados = useMemo(() =>
        asegurados.filter(a =>
            a.toLowerCase().includes(searchAsegurado.toLowerCase())
        ).slice(0, 50),
        [asegurados, searchAsegurado]
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        📝 Bitácora de Gestiones
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Seguimiento de ciclos de cobranza
                    </p>
                </div>
                <button
                    onClick={() => setActiveTab('registrar')}
                    className="btn btn-primary"
                >
                    + Nueva Gestión
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('estado')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'estado'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    📊 Estado Actual
                </button>
                <button
                    onClick={() => setActiveTab('registrar')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'registrar'
                            ? 'border-red-600 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    ✍️ Registrar Gestión
                </button>
            </div>

            {/* Tab: Estado Actual */}
            {activeTab === 'estado' && (
                <>
                    {/* KPIs Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button
                            onClick={() => applyQuickFilter('hoy')}
                            className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 text-left hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-semibold text-blue-700 uppercase">📅 HOY</p>
                            <p className="text-2xl font-bold text-blue-600">{kpis.hoy}</p>
                            <p className="text-xs text-blue-600">Compromisos</p>
                        </button>
                        <button
                            onClick={() => applyQuickFilter('')}
                            className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 text-left hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-semibold text-green-700 uppercase">📆 1-3 días</p>
                            <p className="text-2xl font-bold text-green-600">{kpis.dias1a3}</p>
                            <p className="text-xs text-green-600">Próximos</p>
                        </button>
                        <button
                            onClick={() => applyQuickFilter('')}
                            className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 text-left hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-semibold text-orange-700 uppercase">📅 4-7 días</p>
                            <p className="text-2xl font-bold text-orange-600">{kpis.dias4a7}</p>
                            <p className="text-xs text-orange-600">Semana</p>
                        </button>
                        <button
                            onClick={() => applyQuickFilter('vencidos')}
                            className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 text-left hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-semibold text-red-700 uppercase">🔴 Vencidos</p>
                            <p className="text-2xl font-bold text-red-600">{kpis.vencidos}</p>
                            <p className="text-xs text-red-600">Crítico</p>
                        </button>
                        <button
                            onClick={() => applyQuickFilter('criticos')}
                            className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 border-l-4 border-pink-500 text-left hover:shadow-md transition-shadow"
                        >
                            <p className="text-xs font-semibold text-pink-700 uppercase">⚠️ +60 días</p>
                            <p className="text-2xl font-bold text-pink-600">{kpis.aging60}</p>
                            <p className="text-xs text-pink-600">Aging</p>
                        </button>
                    </div>

                    {/* Search + Quick Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[250px]">
                            <input
                                type="search"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                placeholder="🔍 Buscar asegurado..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => applyQuickFilter('vencidos')}
                                className="px-3 py-1.5 text-xs rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            >
                                ⚠️ Vencidos
                            </button>
                            <button
                                onClick={() => applyQuickFilter('criticos')}
                                className="px-3 py-1.5 text-xs rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100"
                            >
                                🔴 +60 días
                            </button>
                            <button
                                onClick={() => applyQuickFilter('sin_respuesta')}
                                className="px-3 py-1.5 text-xs rounded-full bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                            >
                                ❌ Sin respuesta
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1.5 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                            >
                                🔄 Limpiar
                            </button>
                            <button
                                onClick={exportCSV}
                                className="px-3 py-1.5 text-xs rounded-full bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                            >
                                📥 CSV
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="card bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    📌 Estado
                                </label>
                                <select
                                    value={filters.estado}
                                    onChange={(e) => { setFilters(f => ({ ...f, estado: e.target.value })); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    {ESTADOS.map(e => (
                                        <option key={e.value} value={e.value}>{e.icon} {e.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    👤 Responsable
                                </label>
                                <select
                                    value={filters.responsable}
                                    onChange={(e) => { setFilters(f => ({ ...f, responsable: e.target.value })); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">Todos</option>
                                    {responsables.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    📅 Antigüedad
                                </label>
                                <select
                                    value={filters.diasMinimos}
                                    onChange={(e) => { setFilters(f => ({ ...f, diasMinimos: e.target.value })); setPage(1); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">Todos</option>
                                    <option value="7">📗 Reciente (0-7 días)</option>
                                    <option value="8">📙 Medio (8-30 días)</option>
                                    <option value="31">📕 Antiguo (31-60 días)</option>
                                    <option value="60">🔴 Crítico (+60 días)</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <p className="text-sm text-gray-500">
                                    {total} ciclos encontrados
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden p-0">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asegurado</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencido PEN</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vencido USD</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Gestión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {ciclos.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center">
                                                    <p className="text-lg text-gray-400 dark:text-gray-500">No hay ciclos que mostrar</p>
                                                    <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">Intente ajustar los filtros o realizar una búsqueda diferente</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            ciclos.map((ciclo) => (
                                                <tr
                                                    key={ciclo.idCiclo}
                                                    onClick={() => loadCicloDetail(ciclo)}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 font-medium">{ciclo.asegurado}</td>
                                                    <td className="px-4 py-3">{getEstadoBadge(ciclo.estado)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`font-medium ${ciclo.diasSinGestion >= 60 ? 'text-red-600' : ciclo.diasSinGestion >= 30 ? 'text-orange-600' : ''}`}>
                                                            {ciclo.diasSinGestion}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-sm">
                                                        {formatCurrency(ciclo.vencidoPen, 'PEN')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-sm">
                                                        {formatCurrency(ciclo.vencidoUsd, 'USD')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{ciclo.responsable || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{ciclo.fechaUltimaGestion || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Página {page} de {totalPages} ({total} total)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="btn btn-secondary px-3"
                            >
                                ⏮
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-secondary"
                            >
                                ← Anterior
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="btn btn-secondary"
                            >
                                Siguiente →
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page >= totalPages}
                                className="btn btn-secondary px-3"
                            >
                                ⏭
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Tab: Registrar Gestión */}
            {activeTab === 'registrar' && (
                <div className="card max-w-2xl">
                    <h2 className="text-lg font-semibold mb-4">✍️ Registrar Nueva Gestión</h2>
                    <form onSubmit={handleSubmitGestion} className="space-y-4">
                        {/* Asegurado con autocomplete */}
                        <div>
                            <label className="block text-sm font-medium mb-1">🏢 Asegurado *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchAsegurado || nuevaGestion.asegurado}
                                    onChange={(e) => {
                                        setSearchAsegurado(e.target.value);
                                        setNuevaGestion(g => ({ ...g, asegurado: '' }));
                                    }}
                                    placeholder="Buscar cliente..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                {searchAsegurado && filteredAsegurados.length > 0 && !nuevaGestion.asegurado && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredAsegurados.map((a) => (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => {
                                                    setNuevaGestion(g => ({ ...g, asegurado: a }));
                                                    setSearchAsegurado('');
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {nuevaGestion.asegurado && (
                                <p className="mt-1 text-sm text-green-600">✓ {nuevaGestion.asegurado}</p>
                            )}
                        </div>

                        {/* Fecha de Gestión - Automática */}
                        <div>
                            <label className="block text-sm font-medium mb-1">📅 Fecha de Gestión</label>
                            <input
                                type="text"
                                value={new Date().toLocaleString('es-PE')}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                            />
                            <p className="mt-1 text-xs text-gray-400">🤖 Automático - fecha/hora actual</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">📞 Tipo de Gestión</label>
                                <select
                                    value={nuevaGestion.tipo}
                                    onChange={(e) => setNuevaGestion(g => ({ ...g, tipo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {TIPOS_GESTION.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">📌 Nuevo Estado</label>
                                <select
                                    value={nuevaGestion.estado}
                                    onChange={(e) => setNuevaGestion(g => ({ ...g, estado: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    {ESTADOS.filter(e => e.value).map(e => (
                                        <option key={e.value} value={e.value}>{e.icon} {e.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">💬 Comentario *</label>
                            <textarea
                                value={nuevaGestion.comentario}
                                onChange={(e) => setNuevaGestion(g => ({ ...g, comentario: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={3}
                                placeholder="Describe la gestión realizada..."
                                required
                            />
                        </div>

                        {/* Campos condicionales para Compromiso de Pago */}
                        {nuevaGestion.estado === 'COMPROMISO_PAGO' && (
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-4">
                                <p className="text-sm font-medium text-yellow-800">🤝 Datos del Compromiso</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Fecha Compromiso *</label>
                                        <input
                                            type="date"
                                            value={nuevaGestion.fechaCompromiso}
                                            onChange={(e) => setNuevaGestion(g => ({ ...g, fechaCompromiso: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Monto (opcional)</label>
                                        <input
                                            type="number"
                                            value={nuevaGestion.montoCompromiso}
                                            onChange={(e) => setNuevaGestion(g => ({ ...g, montoCompromiso: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0.00"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('estado')}
                                className="btn btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !nuevaGestion.asegurado || !nuevaGestion.comentario}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? '⏳ Guardando...' : '💾 Guardar Gestión'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Detail Modal */}
            {selectedCiclo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start sticky top-0 bg-white dark:bg-gray-900">
                            <div>
                                <h2 className="text-xl font-bold">{selectedCiclo.asegurado}</h2>
                                <p className="text-sm text-gray-500">Ciclo: {selectedCiclo.idCiclo}</p>
                            </div>
                            <button
                                onClick={() => setSelectedCiclo(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Estado</p>
                                    {getEstadoBadge(selectedCiclo.estado)}
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Días sin gestión</p>
                                    <p className="font-semibold">{selectedCiclo.diasSinGestion}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Gestiones</p>
                                    <p className="font-semibold">{selectedCiclo.totalGestiones || gestiones.length}</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <h3 className="font-semibold mb-4">📋 Historial de Gestiones</h3>
                            {loadingDetail ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : gestiones.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No hay gestiones registradas</p>
                            ) : (
                                <div className="space-y-4">
                                    {gestiones.map((g, i) => (
                                        <div key={i} className="border-l-4 border-red-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-medium">{g.tipo}</span>
                                                    <span className="mx-2">•</span>
                                                    {getEstadoBadge(g.estado)}
                                                </div>
                                                <span className="text-sm text-gray-500">{g.fecha}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{g.comentario}</p>
                                            <p className="text-xs text-gray-400 mt-1">Por: {g.responsable}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <button
                                onClick={() => {
                                    setNuevaGestion(g => ({ ...g, asegurado: selectedCiclo.asegurado }));
                                    setSelectedCiclo(null);
                                    setActiveTab('registrar');
                                }}
                                className="btn btn-primary flex-1"
                            >
                                + Nueva Gestión
                            </button>
                            <button
                                onClick={() => setSelectedCiclo(null)}
                                className="btn btn-secondary flex-1"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
