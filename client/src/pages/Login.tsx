import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Shield, Users, BarChart3, Lock } from "lucide-react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{
          background: "linear-gradient(145deg, oklch(0.14 0.03 255) 0%, oklch(0.20 0.06 265) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.15 255 / 0.2)" }}>
            <Shield size={18} style={{ color: "oklch(0.72 0.15 255)" }} />
          </div>
          <span className="text-white font-semibold tracking-tight">Rencia Admin</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
            Painel de<br />
            <span style={{ color: "oklch(0.72 0.15 255)" }}>Administração</span>
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "oklch(0.62 0.03 255)" }}>
            Gerencie usuários, controle permissões e monitore estatísticas do sistema em um único lugar.
          </p>

          <div className="space-y-4">
            {[
              { icon: <Users size={16} />, title: "Gerenciamento de Usuários", desc: "Liste, filtre e edite funções de usuários" },
              { icon: <BarChart3 size={16} />, title: "Dashboard Analítico", desc: "Estatísticas em tempo real do sistema" },
              { icon: <Lock size={16} />, title: "Controle de Acesso", desc: "Gerencie permissões de administrador" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "oklch(0.72 0.15 255 / 0.15)", color: "oklch(0.72 0.15 255)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.03 255)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "oklch(0.42 0.03 255)" }}>
          © {new Date().getFullYear()} Rencia App. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield size={16} className="text-primary" />
            </div>
            <span className="font-semibold text-foreground">Rencia Admin</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Faça login para acessar o painel administrativo.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.07 255) 0%, oklch(0.38 0.12 265) 100%)",
                color: "oklch(0.98 0.003 240)",
                boxShadow: "0 4px 14px oklch(0.28 0.07 255 / 0.3)",
              }}
            >
              <Shield size={16} />
              Entrar com Manus OAuth
              <ChevronRight size={15} className="ml-auto" />
            </a>
          </div>

          <div className="mt-8 p-4 rounded-xl border border-border bg-muted/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Acesso seguro:</strong> Utilizamos OAuth para garantir que apenas usuários autorizados possam acessar o painel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
