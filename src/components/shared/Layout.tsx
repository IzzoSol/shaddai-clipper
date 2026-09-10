import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { ToastContainer } from '@/components/ui/toast'
import { BootSequence } from '@/components/BootSequence'
import { ThemePicker } from '@/components/ThemePicker'
import { CreditsPill } from '@/components/CreditsPill'
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  Images,
  Send,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { to: '/clips', icon: LayoutDashboard, label: 'Dashboard', end: true, code: '01' },
  { to: '/clips/upload', icon: Upload, label: 'Upload Source', code: '02' },
  { to: '/clips/sources', icon: FolderOpen, label: 'Sources', code: '03' },
  { to: '/clips/gallery', icon: Images, label: 'Gallery', code: '04' },
  { to: '/clips/export-queue', icon: Send, label: 'Export Queue', code: '05' },
  { to: '/clips/settings', icon: Settings, label: 'Brand Profiles', code: '06' },
]

export function ClipsLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const currentPage = navItems.find(
    (item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))
  )

  // Close the mobile drawer whenever the route changes (tapping a nav link
  // both navigates and closes it).
  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-background transition-colors">
      {/* ── Mobile backdrop — tap to close the drawer ── */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar — fixed off-canvas drawer on mobile, persistent column on desktop ── */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-surface transition-all duration-300',
          'fixed inset-y-0 left-0 z-50 w-64 -translate-x-full',
          mobileNavOpen && 'translate-x-0',
          'md:relative md:inset-auto md:z-auto md:translate-x-0',
          sidebarCollapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        {/* Wordmark */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          {sidebarCollapsed ? (
            <span className="font-display text-2xl font-extrabold text-primary mx-auto leading-none">S</span>
          ) : (
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-extrabold tracking-tight">
                SHADDAI<span className="text-primary">.</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground mt-1">
                Cutting&nbsp;Room
              </span>
            </div>
          )}
        </div>

        {!sidebarCollapsed && <div className="film-strip mx-4 mt-3" />}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 mt-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-2'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* accent rail */}
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all',
                      isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
                    )}
                  />
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-muted-foreground">
                        {item.code}
                      </span>
                    </>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Tier card */}
        {!sidebarCollapsed && (
          <div className="mx-3 mb-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plan</span>
              <span className="font-mono text-[10px] text-primary">FREE</span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '24%' }} />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">12 / 50 clips this month</p>
          </div>
        )}

        {/* Collapse toggle — desktop-only; the mobile drawer always opens at full width */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-surface/80 backdrop-blur">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden shrink-0 -ml-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="rec-dot h-2 w-2 rounded-full bg-secondary shadow-[0_0_8px_var(--color-secondary)] shrink-0" />
            <h1 className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground truncate">
              {(currentPage?.label || 'Clips')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <CreditsPill />
              <ThemePicker />
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-display">
              U
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 shaddai-scrollbar">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
      <BootSequence />
    </div>
  )
}
