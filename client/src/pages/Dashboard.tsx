import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Shield,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { Link } from "wouter";

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: color + "18" }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <TrendingUp size={12} />
          {trend ?? "—"}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground tracking-tight mb-1">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </p>
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading, error: statsError } = trpc.users.stats.useQuery(undefined, {
    enabled: isAdmin,
  });

  return (
    <AdminLayout title="Dashboard">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Olá, {user?.name?.split(" ")[0] ?? "Usuário"} 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Bem-vindo ao painel administrativo. Aqui está um resumo do sistema.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
            <Clock size={13} />
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Stats Grid */}
        {isAdmin ? (
          <>
            {statsError ? (
              <div className="bg-card rounded-2xl border border-destructive/20 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-destructive" />
                  <p className="text-sm font-medium text-foreground">Erro ao carregar estatísticas</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{statsError.message}</p>
              </div>
            ) : statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-muted mb-4" />
                    <div className="h-8 w-20 bg-muted rounded mb-2" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total de Usuários"
                  value={stats?.total ?? 0}
                  subtitle="Usuários registrados"
                  icon={<Users size={22} />}
                  color="oklch(0.52 0.18 255)"
                  trend="Total"
                />
                <StatCard
                  title="Administradores"
                  value={stats?.admins ?? 0}
                  subtitle="Com acesso total"
                  icon={<Shield size={22} />}
                  color="oklch(0.55 0.17 145)"
                  trend="Admin"
                />
                <StatCard
                  title="Usuários Comuns"
                  value={stats?.regularUsers ?? 0}
                  subtitle="Acesso padrão"
                  icon={<User size={22} />}
                  color="oklch(0.65 0.18 65)"
                  trend="User"
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Ações Rápidas</h3>
                  <Activity size={16} className="text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Link href="/users">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users size={16} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Gerenciar Usuários</p>
                        <p className="text-xs text-muted-foreground">Ver, filtrar e editar funções</p>
                      </div>
                      <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                  <Link href="/profile">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Meu Perfil</p>
                        <p className="text-xs text-muted-foreground">Ver suas informações pessoais</p>
                      </div>
                      <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Distribution Chart */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Distribuição de Funções</h3>
                </div>
                {stats && stats.total > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Usuários Comuns</span>
                        <span className="font-semibold text-foreground">
                          {Math.round((stats.regularUsers / stats.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(stats.regularUsers / stats.total) * 100}%`,
                            background: "oklch(0.52 0.18 255)",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Administradores</span>
                        <span className="font-semibold text-foreground">
                          {Math.round((stats.admins / stats.total) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(stats.admins / stats.total) * 100}%`,
                            background: "oklch(0.55 0.17 145)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stats.total} usuário{stats.total !== 1 ? "s" : ""} no total</span>
                      <Link href="/users">
                        <span className="text-primary font-medium hover:underline cursor-pointer flex items-center gap-1">
                          Ver todos <ChevronRight size={12} />
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Users size={32} className="text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Non-admin view */
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Bem-vindo, {user?.name?.split(" ")[0]}!</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Você está autenticado como usuário padrão. Acesse seu perfil para ver suas informações.
              </p>
              <Link href="/profile">
                <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  Ver Meu Perfil
                  <ChevronRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
