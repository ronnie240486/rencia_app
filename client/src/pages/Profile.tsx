import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  AtSign,
  Calendar,
  Clock,
  Key,
  LogOut,
  Shield,
  User,
} from "lucide-react";

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        {/* Wrap text in a span to prevent browser extensions from breaking React's DOM reconciliation */}
        <p className="text-sm font-medium text-foreground truncate">
          <span>{value != null && value !== "" ? value : "Não informado"}</span>
        </p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading, error } = trpc.adminUsers.profile.useQuery();

  const displayUser = profile ?? user;

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return "Não informado";
    try {
      return new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Não informado";
    }
  };

  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return "Não informado";
    try {
      return new Date(date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Não informado";
    }
  };

  const roleName = displayUser?.role === "admin" ? "Administrador" : "Usuário";
  const initials = displayUser?.name?.charAt(0)?.toUpperCase() ?? "U";
  const displayName = displayUser?.name ?? "Usuário";

  if (error) {
    return (
      <AdminLayout title="Meu Perfil">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl border border-destructive/20 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <p className="text-sm font-semibold text-foreground">Erro ao carregar perfil</p>
            </div>
            <p className="text-xs text-muted-foreground"><span>{error.message}</span></p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Meu Perfil">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div
            className="h-28 w-full"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 255) 0%, oklch(0.45 0.15 270) 100%)",
            }}
          />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div
                className="w-20 h-20 rounded-2xl border-4 border-card flex items-center justify-center text-2xl font-bold shadow-md"
                style={{
                  background: "linear-gradient(135deg, oklch(0.35 0.1 255) 0%, oklch(0.52 0.18 270) 100%)",
                  color: "oklch(0.98 0.003 240)",
                }}
              >
                <span>{initials}</span>
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-40 h-6 bg-muted rounded animate-pulse" />
                  ) : (
                    <span>{displayName}</span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={
                      displayUser?.role === "admin"
                        ? { background: "oklch(0.55 0.17 145 / 0.15)", color: "oklch(0.45 0.17 145)" }
                        : { background: "oklch(0.52 0.18 255 / 0.12)", color: "oklch(0.42 0.15 255)" }
                    }
                  >
                    {displayUser?.role === "admin" ? <Shield size={11} /> : <User size={11} />}
                    <span>{roleName}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1"><span>{"Informações Pessoais"}</span></h3>
          <p className="text-xs text-muted-foreground mb-4"><span>{"Dados da sua conta no sistema"}</span></p>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <InfoRow icon={<User size={16} />} label="Nome Completo" value={displayUser?.name} />
              <InfoRow icon={<AtSign size={16} />} label="E-mail" value={displayUser?.email} />
              <InfoRow
                icon={<Key size={16} />}
                label="Método de Login"
                value={displayUser?.loginMethod ?? "OAuth"}
              />
              <InfoRow
                icon={<Calendar size={16} />}
                label="Membro desde"
                value={formatDate(displayUser?.createdAt)}
              />
              <InfoRow
                icon={<Clock size={16} />}
                label="Último acesso"
                value={formatDateTime(displayUser?.lastSignedIn)}
              />
            </div>
          )}
        </div>

        {/* Session Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-1"><span>{"Sessão"}</span></h3>
          <p className="text-xs text-muted-foreground mb-4"><span>{"Gerencie sua sessão atual"}</span></p>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            <LogOut size={15} />
            <span>{"Encerrar Sessão"}</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
