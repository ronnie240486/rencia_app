import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  Filter,
  Search,
  Shield,
  User,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { useState, useCallback } from "react";

type RoleFilter = "all" | "admin" | "user";

function RoleBadge({ role }: { role: "admin" | "user" }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={
        role === "admin"
          ? { background: "oklch(0.55 0.17 145 / 0.12)", color: "oklch(0.42 0.17 145)" }
          : { background: "oklch(0.52 0.18 255 / 0.10)", color: "oklch(0.40 0.15 255)" }
      }
    >
      {role === "admin" ? <Shield size={11} /> : <User size={11} />}
      {role === "admin" ? "Admin" : "Usuário"}
    </span>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [pendingRole, setPendingRole] = useState<{ userId: number; name: string; newRole: "admin" | "user" } | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.users.list.useQuery({
    search: search.trim() || undefined,
    role: roleFilter,
    limit: 50,
    offset: 0,
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Função atualizada com sucesso!");
      utils.users.list.invalidate();
      utils.users.stats.invalidate();
      setPendingRole(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Erro ao atualizar função.");
      setPendingRole(null);
    },
  });

  const handleRoleChange = useCallback(
    (userId: number, name: string, currentRole: "admin" | "user") => {
      const newRole = currentRole === "admin" ? "user" : "admin";
      setPendingRole({ userId, name, newRole });
    },
    []
  );

  const confirmRoleChange = () => {
    if (!pendingRole) return;
    updateRoleMutation.mutate({ userId: pendingRole.userId, role: pendingRole.newRole });
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  return (
    <AdminLayout title="Usuários">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">Gerenciar Usuários</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Carregando..." : `${total} usuário${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="pl-8 pr-8 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 appearance-none cursor-pointer transition-all min-w-[140px]"
              >
                <option value="all">Todas as funções</option>
                <option value="admin">Administradores</option>
                <option value="user">Usuários</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>

          {/* Active filters */}
          {(search || roleFilter !== "all") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Filtros ativos:</span>
              {search && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  "{search}"
                  <button onClick={() => setSearch("")}><X size={11} /></button>
                </span>
              )}
              {roleFilter !== "all" && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {roleFilter === "admin" ? "Admins" : "Usuários"}
                  <button onClick={() => setRoleFilter("all")}><X size={11} /></button>
                </span>
              )}
              <button
                onClick={() => { setSearch(""); setRoleFilter("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-56 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded-full" />
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-8 w-24 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle size={22} className="text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Erro ao carregar usuários</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <UsersIcon size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum usuário encontrado</p>
              <p className="text-xs text-muted-foreground">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Usuário
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">
                        Função
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">
                        Membro desde
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">
                        Último acesso
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                                style={{
                                  background: u.role === "admin"
                                    ? "oklch(0.55 0.17 145 / 0.15)"
                                    : "oklch(0.52 0.18 255 / 0.12)",
                                  color: u.role === "admin"
                                    ? "oklch(0.42 0.17 145)"
                                    : "oklch(0.40 0.15 255)",
                                }}
                              >
                                {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                  {u.name ?? "—"}
                                  {isSelf && (
                                    <span className="ml-2 text-xs text-muted-foreground font-normal">(você)</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {u.email ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={u.isActive
                                ? { background: "oklch(0.55 0.17 145 / 0.12)", color: "oklch(0.42 0.17 145)" }
                                : { background: "oklch(0.55 0.22 25 / 0.10)", color: "oklch(0.45 0.18 25)" }
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.isActive ? "oklch(0.55 0.17 145)" : "oklch(0.55 0.22 25)" }} />
                              {u.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {formatDate(u.lastSignedIn)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(u.id, u.name ?? "Usuário", u.role)}
                                disabled={updateRoleMutation.isPending}
                                className={cn(
                                  "text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-150",
                                  u.role === "admin"
                                    ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                                    : "border-primary/30 text-primary hover:bg-primary/5"
                                )}
                              >
                                {u.role === "admin" ? "Rebaixar" : "Promover"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                            style={{
                              background: u.role === "admin"
                                ? "oklch(0.55 0.17 145 / 0.15)"
                                : "oklch(0.52 0.18 255 / 0.12)",
                              color: u.role === "admin"
                                ? "oklch(0.42 0.17 145)"
                                : "oklch(0.40 0.15 255)",
                            }}
                          >
                            {u.name?.charAt(0)?.toUpperCase() ?? "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {u.name ?? "—"}
                              {isSelf && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                          </div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Desde {formatDate(u.createdAt)}</span>
                        {!isSelf && (
                          <button
                            onClick={() => handleRoleChange(u.id, u.name ?? "Usuário", u.role)}
                            disabled={updateRoleMutation.isPending}
                            className={cn(
                              "font-medium px-3 py-1.5 rounded-lg border transition-all",
                              u.role === "admin"
                                ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                                : "border-primary/30 text-primary hover:bg-primary/5"
                            )}
                          >
                            {u.role === "admin" ? "Rebaixar" : "Promover"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Exibindo {users.length} de {total} usuário{total !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPendingRole(null)}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} style={{ color: "oklch(0.65 0.18 65)" }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Confirmar alteração</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Deseja{" "}
                  <strong className="text-foreground">
                    {pendingRole.newRole === "admin" ? "promover" : "rebaixar"}
                  </strong>{" "}
                  <strong className="text-foreground">{pendingRole.name}</strong> para{" "}
                  <strong className="text-foreground">
                    {pendingRole.newRole === "admin" ? "Administrador" : "Usuário"}
                  </strong>
                  ?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingRole(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={updateRoleMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateRoleMutation.isPending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
