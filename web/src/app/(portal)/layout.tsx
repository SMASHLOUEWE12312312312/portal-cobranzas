import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';

/**
 * Protected Portal Layout
 * 
 * Wrapper for authenticated pages with sidebar navigation.
 * Redirects to login if not authenticated.
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

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-gray-800">
                    <Link href="/bitacora" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                            <span className="text-white font-bold">TP</span>
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm">Portal Cobranzas</h1>
                            <p className="text-xs text-gray-400">Transperuana</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    <NavLink href="/bitacora" icon="📊">
                        Bitácora
                    </NavLink>
                    <NavLink href="/mail" icon="📧">
                        Cola de Correos
                    </NavLink>
                    <NavLink href="/eecc" icon="📄">
                        Estados de Cuenta
                    </NavLink>

                    {/* Admin Only */}
                    {user.role === 'ADMIN' && (
                        <>
                            <div className="pt-4 mt-4 border-t border-gray-800">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                                    Administración
                                </p>
                            </div>
                            <NavLink href="/admin" icon="⚙️">
                                Configuración
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {user.displayName || user.username}
                            </p>
                            <p className="text-xs text-gray-400">{user.role}</p>
                        </div>
                    </div>
                    <form action="/api/auth/logout" method="POST" className="mt-3">
                        <button
                            type="submit"
                            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main id="main-content" className="flex-1 overflow-auto">
                <div className="p-6">
                    {children}
                </div>
            </main>
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
            <span className="text-lg">{icon}</span>
            <span className="text-sm">{children}</span>
        </Link>
    );
}
