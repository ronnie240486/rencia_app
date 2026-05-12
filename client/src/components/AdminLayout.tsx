import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Shield,
  Store,
  User,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Usuários", href: "/users", icon: <Users size={18} /> },
  { label: "Cadastrar Usuário", href: "/users/create", icon: <BarChart3 size={18} /> },
  { label: "Revendas", href: "/revendas", icon: <Store size={18} /> },
  { label: "Trocar DNS em Massa", href: "/dns-massa", icon: <ArrowRightLeft size={18} /> },
  { label: "Configurações do App", href: "/settings", icon: <SlidersHorizontal size={18} /> },
  { label: "Perfil", href: "/profile", icon: <User size={18} /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Aplica a cor primária salva nas configurações ao carregar o layout
  const { data: allSettings } = trpc.settings.getAll.useQuery(undefined, { staleTime: 60_000 });
  useEffect(() => {
    const hex = allSettings?.primary_color;
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const lightness = (l * 0.8 + 0.2).toFixed(2);
    const hue = Math.round(Math.atan2(b - g, r - b) * 180 / Math.PI + 180);
    document.documentElement.style.setProperty("--primary", `${lightness} 0.15 ${hue}`);
    const luminance = (0.299 * parseInt(hex.slice(1,3),16) + 0.587 * parseInt(hex.slice(3,5),16) + 0.114 * parseInt(hex.slice(5,7),16)) / 255;
    document.documentElement.style.setProperty("--primary-foreground", luminance > 0.5 ? "0.15 0 0" : "0.98 0 0");
  }, [allSettings?.primary_color]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Você precisa estar autenticado para acessar o painel administrativo.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Entrar com Manus
            <ChevronRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const sidebarLogoUrl = allSettings?.sidebar_logo_url || "/api/v4/logo.php";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-center">
        <img
          src={sidebarLogoUrl}
          alt="OuroPro"
          className="w-full h-auto object-contain"
          style={{ maxHeight: "64px" }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.logo-fallback')) {
              const span = document.createElement('span');
              span.className = 'logo-fallback text-xl font-bold';
              span.style.color = 'oklch(0.80 0.15 55)';
              span.textContent = 'OuroPro';
              parent.appendChild(span);
            }
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: "oklch(0.60 0.08 55)" }}>
          Menu
        </p>
        {visibleNavItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                style={{
                  color: isActive
                    ? "var(--color-sidebar-accent-foreground)"
                    : "oklch(0.72 0.05 55)",
                }}
              >
                <span className={cn(isActive ? "text-sidebar-primary" : "")} style={{ color: isActive ? "var(--sidebar-primary)" : undefined }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg" style={{ background: "oklch(0.18 0.04 255)" }}>
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold" style={{ color: "var(--sidebar-primary)" }}>
              <span>{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</span>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "oklch(0.88 0.01 240)" }}>
              <span>{user?.name ?? "Usuário"}</span>
            </p>
            <p className="text-xs truncate" style={{ color: "oklch(0.55 0.02 255)" }}>
              <span>{user?.role === "admin" ? "Administrador" : "Usuário"}</span>
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-md transition-colors hover:bg-sidebar-accent"
            title="Sair"
            style={{ color: "oklch(0.55 0.02 255)" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 fixed left-0 top-0 h-full z-30"
        style={{ background: "var(--sidebar)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative flex flex-col w-72 h-full z-50"
            style={{ background: "var(--sidebar)" }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
              style={{ color: "oklch(0.55 0.02 255)" }}
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={20} className="text-foreground" />
          </button>
          <div className="flex-1">
            {title && (
              <h1 className="text-lg font-semibold text-foreground tracking-tight"><span>{title}</span></h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>{user?.name ?? "Usuário"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
