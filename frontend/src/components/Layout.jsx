import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  ClipboardList,
  DollarSign,
  FileText,
  CalendarCheck,
  Menu,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { getUser, logout } from '../utils/api';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/payments', label: 'Payments', icon: DollarSign },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/site-visits', label: 'Site Visits', icon: CalendarCheck },
];

function pageTitleFromPath(pathname) {
  const item = navItems.find((n) =>
    n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)
  );
  return item?.label || 'Dashboard';
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = pageTitleFromPath(location.pathname);
  const user = getUser();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary-950 transition-transform duration-300
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-white">Glory Simon</h1>
              <p className="text-[11px] font-medium text-primary-300">Interiors</p>
            </div>
          </div>
          <button
            className="rounded-lg p-1 text-primary-300 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                        : 'text-primary-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">{user?.name || 'User'}</p>
              <p className="text-[11px] text-primary-400">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-primary-300 hover:bg-white/10 hover:text-white transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="hidden sm:inline">Home</span>
              <ChevronRight className="hidden h-4 w-4 sm:inline" />
              <span className="font-semibold text-slate-800">{pageTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline">{user?.name}</span>
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
