'use client';

import { useState, useEffect } from 'react';

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

const ESTADOS = [
    { value: '', label: 'Todos los estados' },
    { value: 'SIN_RESPUESTA', label: 'Sin Respuesta', color: 'bg-gray-200' },
    { value: 'EN_SEGUIMIENTO', label: 'En Seguimiento', color: 'bg-blue-200' },
    { value: 'COMPROMISO_PAGO', label: 'Compromiso de Pago', color: 'bg-yellow-200' },
    { value: 'REPROGRAMADO', label: 'Reprogramado', color: 'bg-orange-200' },
    { value: 'DERIVADO_COMERCIAL', label: 'Derivado Comercial', color: 'bg-purple-200' },
    { value: 'CERRADO_PAGADO', label: 'Cerrado - Pagado', color: 'bg-green-200' },
    { value: 'NO_COBRABLE', label: 'No Cobrable', color: 'bg-red-200' },
];

/**
 * Bitácora Page
 * 
 * Displays collection cycles with filtering and pagination.
 */
export default function BitacoraPage() {
    const [ciclos, setCiclos] = useState<Ciclo[]>([]);
    const [loading, setLoading] = useState(true);
    const [responsables, setResponsables] = useState<string[]>([]);
    const [filters, setFilters] = useState<BitacoraFilters>({
        estado: '',
        responsable: '',
        diasMinimos: '',
        search: '',
    });
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 25;
    
    // Detail modal
    const [selectedCiclo, setSelectedCiclo] = useState<Ciclo | null>(null);
    const [gestiones, setGestiones] = useState<Gestion[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Nueva gestión modal
    const [showNuevaGestion, setShowNuevaGestion] = useState(false);
    const [nuevaGestion, setNuevaGestion] = useState({
        asegurado: '',
        tipo: 'LLAMADA',
        estado: 'EN_SEGUIMIENTO',
        comentario: '',
        fechaCompromiso: '',
        montoCompromiso: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBitacora();
        loadResponsables();
    }, []);

    useEffect(() => {
        loadBitacora();
    }, [filters, page]);

    async function loadBitacora() {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                ...(filters.estado && { estado: filters.estado }),
                ...(filters.responsable && { responsable: filters.responsable }),
                ...(filters.diasMinimos && { diasMinimos: filters.diasMinimos }),
                ...(filters.search && { search: filters.search }),
            });

            const res = await fetch(`/api/bitacora?${params}`);
            const data = await res.json();

            if (data.ok) {
                setCiclos(data.data || []);
                if (data.pagination) {
                    setTotalPages(Math.ceil(data.pagination.total / pageSize));
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

    async function loadCicloDetail(ciclo: Ciclo) {
        setSelectedCiclo(ciclo);
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/bitacora/${ciclo.idCiclo}`);
            const data = await res.json();
            if (data.ok) {
                setGestiones(data.data?.gestiones || []);
            }
        } catch (error) {
            console.error('Error loading cycle detail:', error);
        } finally {
            setLoadingDetail(false);
        }
    }

    async function handleSubmitGestion() {
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
                setShowNuevaGestion(false);
                setNuevaGestion({
                    asegurado: '',
                    tipo: 'LLAMADA',
                    estado: 'EN_SEGUIMIENTO',
                    comentario: '',
                    fechaCompromiso: '',
                    montoCompromiso: '',
                });
                loadBitacora();
            } else {
                alert(`Error: ${data.error?.message}`);
            }
        } catch (error) {
            alert('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    }

    function getEstadoBadge(estado: string) {
        const estadoConfig = ESTADOS.find(e => e.value === estado);
        const bgColor = estadoConfig?.color || 'bg-gray-200';
        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
                {estadoConfig?.label || estado}
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
                    onClick={() => setShowNuevaGestion(true)}
                    className="btn btn-primary"
                >
                    + Nueva Gestión
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado
                        </label>
                        <select
                            value={filters.estado}
                            onChange={(e) => setFilters(f => ({ ...f, estado: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {ESTADOS.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Responsable
                        </label>
                        <select
                            value={filters.responsable}
                            onChange={(e) => setFilters(f => ({ ...f, responsable: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Todos</option>
                            {responsables.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Días sin gestión
                        </label>
                        <select
                            value={filters.diasMinimos}
                            onChange={(e) => setFilters(f => ({ ...f, diasMinimos: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">Todos</option>
                            <option value="7">Más de 7 días</option>
                            <option value="15">Más de 15 días</option>
                            <option value="30">Más de 30 días</option>
                            <option value="60">Más de 60 días</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Buscar
                        </label>
                        <input
                            type="search"
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            placeholder="Nombre o RUC..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton h-12 rounded" />
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
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {ciclos.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                            No se encontraron ciclos
                                        </td>
                                    </tr>
                                ) : (
                                    ciclos.map((ciclo) => (
                                        <tr key={ciclo.idCiclo} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => loadCicloDetail(ciclo)}
                                                    className="text-left hover:text-red-600"
                                                >
                                                    <span className="font-medium">{ciclo.asegurado}</span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">{getEstadoBadge(ciclo.estado)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-medium ${ciclo.diasSinGestion > 30 ? 'text-red-600' : ciclo.diasSinGestion > 15 ? 'text-orange-600' : ''}`}>
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
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {ciclo.fechaUltimaGestion || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => loadCicloDetail(ciclo)}
                                                    className="text-sm text-red-600 hover:underline"
                                                >
                                                    Ver detalle
                                                </button>
                                            </td>
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
                    Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn btn-secondary"
                    >
                        Anterior
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="btn btn-secondary"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedCiclo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
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
                                    <p className="font-semibold">{selectedCiclo.totalGestiones || 0}</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <h3 className="font-semibold mb-4">Historial de Gestiones</h3>
                            {loadingDetail ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="skeleton h-20 rounded" />
                                    ))}
                                </div>
                            ) : gestiones.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No hay gestiones registradas</p>
                            ) : (
                                <div className="space-y-4">
                                    {gestiones.map((g, i) => (
                                        <div key={i} className="border-l-4 border-red-500 pl-4 py-2">
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
                    </div>
                </div>
            )}

            {/* Nueva Gestión Modal */}
            {showNuevaGestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Nueva Gestión</h2>
                            <button
                                onClick={() => setShowNuevaGestion(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Asegurado *</label>
                                <input
                                    type="text"
                                    value={nuevaGestion.asegurado}
                                    onChange={(e) => setNuevaGestion(g => ({ ...g, asegurado: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Nombre del asegurado"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo de Gestión</label>
                                    <select
                                        value={nuevaGestion.tipo}
                                        onChange={(e) => setNuevaGestion(g => ({ ...g, tipo: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="LLAMADA">Llamada</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="VISITA">Visita</option>
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Nuevo Estado</label>
                                    <select
                                        value={nuevaGestion.estado}
                                        onChange={(e) => setNuevaGestion(g => ({ ...g, estado: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        {ESTADOS.filter(e => e.value).map(e => (
                                            <option key={e.value} value={e.value}>{e.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Comentario *</label>
                                <textarea
                                    value={nuevaGestion.comentario}
                                    onChange={(e) => setNuevaGestion(g => ({ ...g, comentario: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                    placeholder="Describe la gestión realizada..."
                                />
                            </div>

                            {nuevaGestion.estado === 'COMPROMISO_PAGO' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Fecha Compromiso</label>
                                        <input
                                            type="date"
                                            value={nuevaGestion.fechaCompromiso}
                                            onChange={(e) => setNuevaGestion(g => ({ ...g, fechaCompromiso: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Monto Compromiso</label>
                                        <input
                                            type="number"
                                            value={nuevaGestion.montoCompromiso}
                                            onChange={(e) => setNuevaGestion(g => ({ ...g, montoCompromiso: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <button
                                onClick={() => setShowNuevaGestion(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitGestion}
                                disabled={submitting || !nuevaGestion.asegurado || !nuevaGestion.comentario}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? '⏳ Guardando...' : '💾 Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
