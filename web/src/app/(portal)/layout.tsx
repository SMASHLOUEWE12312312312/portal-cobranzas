import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';
import NotificationsPanel from '@/components/NotificationsPanel';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * Protected Portal Layout
 * 
 * Wrapper for authenticated pages with sidebar navigation.
 * Redirects to login if not authenticated.
 * 
 * Includes all 6 main modules:
 * - Dashboard
 * - Actualizar (Base)
 * - Generar (EECC)
 * - Enviar (Mail)
 * - Bitácora
 * - Conciliación
 */
export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    const { user } = session;

    // Navigation items - matches GAS portal structure
    const navItems = [
        { href: '/dashboard', icon: '📊', label: 'Dashboard' },
        { href: '/actualizar', icon: '📤', label: 'Actualizar Base' },
        { href: '/generar', icon: '📄', label: 'Generar EECC' },
        { href: '/enviar', icon: '📧', label: 'Enviar Correos' },
        { href: '/bitacora', icon: '📝', label: 'Bitácora' },
        { href: '/conciliacion', icon: '🔄', label: 'Conciliación' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
            {/* Skip Link for Accessibility */}
            <a href="#main-content" className="skip-link">
                Saltar al contenido principal
            </a>

            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-gray-800">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">TP</span>
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm">Portal Cobranzas</h1>
                            <p className="text-xs text-gray-400">Transperuana</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-3">
                        Menú Principal
                    </p>
                    
                    {navItems.map((item) => (
                        <NavLink key={item.href} href={item.href} icon={item.icon}>
                            {item.label}
                        </NavLink>
                    ))}

                    {/* Admin Only - Coming Soon */}
                    {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
                        <>
                            <div className="pt-4 mt-4 border-t border-gray-800">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-3">
                                    Administración
                                </p>
                            </div>
                            {/* TODO: Implementar página de configuración */}
                            <div className="px-3 py-2 text-gray-500 text-sm flex items-center gap-2">
                                <span>⚙️</span>
                                <span>Configuración</span>
                                <span className="ml-auto text-xs bg-gray-700 px-2 py-0.5 rounded">Próximamente</span>
                            </div>
                        </>
                    )}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-sm font-semibold shadow">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user.displayName || user.username}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">{user.role.toLowerCase()}</p>
                        </div>
                    </div>
                    <form action="/api/auth/logout" method="POST" className="mt-3">
                        <button
                            type="submit"
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <span>🚪</span>
                            <span>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
                    <div className="text-lg font-semibold text-gray-800 dark:text-white">
                        Portal Cobranzas
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <ThemeToggle />
                        {/* Notifications Panel */}
                        <NotificationsPanel />
                    </div>
                </header>

                {/* Main Scroll Area */}
                <main id="main-content" className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
                    <div className="p-6 page-transition">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

/**
 * Navigation Link Component
 */
function NavLink({
    href,
    icon,
    children,
}: {
    href: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-150 group"
        >
            <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-sm font-medium">{children}</span>
        </Link>
    );
}
