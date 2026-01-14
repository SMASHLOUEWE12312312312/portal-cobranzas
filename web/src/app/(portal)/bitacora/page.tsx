import { Suspense } from 'react';
import { getSession } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { redirect } from 'next/navigation';

/**
 * Bitácora Page
 * 
 * Displays collection cycles with filtering and pagination.
 * Premium UI with WCAG 2.2 AA compliance.
 */
export default async function BitacoraPage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    // Check permission
    if (!hasPermission(session, 'BITACORA:READ')) {
        return (
            <div className="card text-center py-12">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Acceso Denegado
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    No tienes permisos para ver la bitácora.
                </p>
            </div>
        );
    }

    const canWrite = hasPermission(session, 'BITACORA:WRITE');

    return (
        <div className="space-y-6 page-transition">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Bitácora de Gestiones
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Seguimiento de ciclos de cobranza
                    </p>
                </div>

                {canWrite && (
                    <button
                        className="btn btn-primary"
                        id="btn-nueva-gestion"
                    >
                        + Nueva Gestión
                    </button>
                )}
            </header>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-wrap gap-4">
                    {/* Estado Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="filter-estado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado
                        </label>
                        <select
                            id="filter-estado"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="SIN_RESPUESTA">Sin Respuesta</option>
                            <option value="EN_SEGUIMIENTO">En Seguimiento</option>
                            <option value="COMPROMISO_PAGO">Compromiso de Pago</option>
                            <option value="REPROGRAMADO">Reprogramado</option>
                            <option value="CERRADO_PAGADO">Cerrado - Pagado</option>
                            <option value="NO_COBRABLE">No Cobrable</option>
                        </select>
                    </div>

                    {/* Responsable Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="filter-responsable" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Responsable
                        </label>
                        <select
                            id="filter-responsable"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Todos</option>
                        </select>
                    </div>

                    {/* Días Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="filter-dias" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Días sin gestión
                        </label>
                        <select
                            id="filter-dias"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Todos</option>
                            <option value="7">Más de 7 días</option>
                            <option value="15">Más de 15 días</option>
                            <option value="30">Más de 30 días</option>
                            <option value="60">Más de 60 días</option>
                        </select>
                    </div>

                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <label htmlFor="filter-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Buscar asegurado
                        </label>
                        <input
                            id="filter-search"
                            type="search"
                            placeholder="Nombre o RUC..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <Suspense fallback={<TableSkeleton />}>
                    <BitacoraTablePlaceholder />
                </Suspense>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando <span className="font-medium">1-25</span> de <span className="font-medium">--</span> resultados
                </p>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" disabled>
                        Anterior
                    </button>
                    <button className="btn btn-secondary">
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Table Skeleton for Loading State
 */
function TableSkeleton() {
    return (
        <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="skeleton h-10 w-48 rounded" />
                    <div className="skeleton h-10 w-32 rounded" />
                    <div className="skeleton h-10 w-24 rounded" />
                    <div className="skeleton h-10 flex-1 rounded" />
                </div>
            ))}
        </div>
    );
}

/**
 * Placeholder Table (will be replaced with client component)
 */
function BitacoraTablePlaceholder() {
    return (
        <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asegurado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsable
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Gestión
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Cargando datos...
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
