import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Server,
  ShoppingBag,
  SlidersHorizontal,
  Shield,
  Store,
  User,
  Users,
  X,
  Film,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  ownerOnly?: boolean; // Apenas para Ultra Master e dono
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Usuários", href: "/users", icon: <Users size={18} /> },
  { label: "Cadastrar Usuário", href: "/users/create", icon: <BarChart3 size={18} /> },
  { label: "Revendas", href: "/revendas", icon: <Store size={18} /> },
  { label: "Chatbot de Avisos", href: "/chatbot", icon: <MessageCircle size={18} />, ownerOnly: true },
  { label: "DNS", href: "/dns", icon: <Server size={18} /> },
  { label: "Loja", href: "/loja", icon: <ShoppingBag size={18} />, ownerOnly: true },
  { label: "Carousel do App", href: "/carousel", icon: <Film size={18} />, ownerOnly: true },
  { label: "Configurações do App", href: "/settings", icon: <SlidersHorizontal size={18} />, ownerOnly: true },
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
  const { data: settings } = trpc.settings.getAll.useQuery();

  // IMPORTANTE: trpc.plan.info.useQuery() deve ser chamado ANTES de qualquer return condicional
  // para não violar a regra dos hooks do React (React Error #310)
  const { data: planInfo } = trpc.plan.info.useQuery();

  // Aplicar cor primária, cor da sidebar e logo ao carregar
  useEffect(() => {
    if (!settings) return;

    // Helper: converte HEX para oklch aproximado via HSL
    const hexToOklch = (hex: string) => {
      if (!hex || !hex.startsWith("#") || hex.length !== 7) return null;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    // Cor primária dos botões
    const primaryHsl = hexToOklch(settings.primary_color);
    if (primaryHsl) {
      document.documentElement.style.setProperty("--primary", `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    }

    // Cor da sidebar
    const sidebarColor = (settings as Record<string, string>).sidebar_color;
    if (sidebarColor && sidebarColor.startsWith("#") && sidebarColor.length === 7) {
      const r2 = parseInt(sidebarColor.slice(1, 3), 16) / 255;
      const g2 = parseInt(sidebarColor.slice(3, 5), 16) / 255;
      const b2 = parseInt(sidebarColor.slice(5, 7), 16) / 255;
      const l2 = (Math.max(r2, g2, b2) + Math.min(r2, g2, b2)) / 2;
      const c2 = Math.max(r2, g2, b2) - Math.min(r2, g2, b2);
      // Usar oklch aproximado
      document.documentElement.style.setProperty("--sidebar", `oklch(${l2.toFixed(2)} ${(c2 * 0.3).toFixed(2)} ${hexToOklch(sidebarColor)?.h ?? 55})`);
      document.documentElement.style.setProperty("--sidebar-accent", `oklch(${Math.min(l2 + 0.06, 1).toFixed(2)} ${(c2 * 0.25).toFixed(2)} ${hexToOklch(sidebarColor)?.h ?? 55})`);
      document.documentElement.style.setProperty("--sidebar-border", `oklch(${Math.min(l2 + 0.12, 1).toFixed(2)} ${(c2 * 0.2).toFixed(2)} ${hexToOklch(sidebarColor)?.h ?? 55})`);
    }

    // Cor do texto (letras)
    const textColor = (settings as Record<string, string>).text_color;
    if (textColor && textColor.startsWith("#") && textColor.length === 7) {
      document.documentElement.style.setProperty("--foreground", textColor);
      document.documentElement.style.setProperty("--card-foreground", textColor);
      document.documentElement.style.setProperty("--popover-foreground", textColor);
    } else {
      document.documentElement.style.removeProperty("--foreground");
      document.documentElement.style.removeProperty("--card-foreground");
      document.documentElement.style.removeProperty("--popover-foreground");
    }
  }, [settings]);

  const sidebarLogoUrl = settings?.sidebar_logo_url || "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouroupro_logo_dark-fXyM9RJb5jrckbNeNbskGi.webp";

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
  // Ultra Master e dono veem tudo; Revenda e Master não veem itens ownerOnly
  const isUltraMaster = !planInfo?.plano || planInfo.plano === "Ultra Master" || (planInfo.limiteDevices ?? 0) >= 999999;
  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.ownerOnly && !isUltraMaster) return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <img
          src={sidebarLogoUrl}
          alt="OuroPro"
          className="w-full h-auto object-contain"
          style={{ maxHeight: "64px" }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/ouroupro_logo_dark-fXyM9RJb5jrckbNeNbskGi.webp'; }}
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
