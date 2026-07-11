import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Shield, Users, BarChart3, Lock, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginMutation = trpc.auth.loginLocal.useMutation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

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
          <span className="text-white font-semibold tracking-tight"><span>{"OuroPro"}</span></span>
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
                  <p className="text-sm font-medium text-white"><span>{item.title}</span></p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.03 255)" }}><span>{item.desc}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "oklch(0.42 0.03 255)" }}>
          <span>{"\u00a9 "}</span><span>{new Date().getFullYear()}</span><span>{" OuroPro. Todos os direitos reservados."}</span>
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
            <span className="font-semibold text-foreground">OuroPro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">
              <span>{"Bem-vindo de volta"}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              <span>{"Faça login com suas credenciais para acessar o painel."}</span>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.07 255) 0%, oklch(0.38 0.12 265) 100%)",
                color: "oklch(0.98 0.003 240)",
                boxShadow: "0 4px 14px oklch(0.28 0.07 255 / 0.3)",
              }}
            >
              <Shield size={16} />
              <span>{isLoading ? "Entrando..." : "Entrar"}</span>
              <ChevronRight size={15} className="ml-auto" />
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl border border-border bg-muted/40">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Acesso seguro:</strong> Utilize suas credenciais de email e senha para acessar o painel administrativo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
