import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  BarChart3,
  Edit2,
  Loader2,
  Lock,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Unlock,
  Users,
  Shield,
  Link2,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatDateOnlyPtBr, toDateOnly } from "@shared/dateOnly";
import { RESELLER_PERMISSION_CATALOG } from "@shared/resellerPermissions";
import { MANAGED_APP_CATALOG } from "@shared/appCatalog";

interface RevendaForm {
  name: string;
  email: string;
  password: string;
  plano: string;
  planValidade: string;
  limiteDevices: number;
  limiteRevendas: number;
}

const emptyForm: RevendaForm = {
  name: "",
  email: "",
  password: "",
  plano: "Revenda",
  planValidade: "",
  limiteDevices: 50,
  limiteRevendas: 0,
};

export default function Revendas() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blocked">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RevendaForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<{ id: number; name: string } | null>(null);
  const [appAccessTarget, setAppAccessTarget] = useState<{ id: number; name: string } | null>(null);
  const [inviteTarget, setInviteTarget] = useState<{ id: number; name: string } | null>(null);
  const [inviteApps, setInviteApps] = useState<string[]>([]);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [inviteLink, setInviteLink] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.revendas.list.useQuery({ search, page, pageSize: 20 });

  // Filtrar por status no cliente
  const filteredData = (data?.data ?? []).filter(r => {
    if (filterStatus === "active") return r.isActive;
    if (filterStatus === "blocked") return !r.isActive;
    return true;
  });
  const { data: stats } = trpc.revendas.stats.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();

  const createMut = trpc.revendas.create.useMutation({
    onSuccess: () => { toast.success("Revenda criada!"); setShowDialog(false); utils.revendas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.revendas.update.useMutation({
    onSuccess: () => { toast.success("Revenda atualizada!"); setShowDialog(false); utils.revendas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.revendas.delete.useMutation({
    onSuccess: () => { toast.success("Revenda removida!"); setDeleteId(null); utils.revendas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleBlockMut = trpc.revendas.toggleBlock.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.block ? "Revenda bloqueada! Todos os devices foram bloqueados." : "Revenda desbloqueada! Devices liberados.");
      utils.revendas.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: permissionData, isLoading: permissionsLoading } = trpc.resellerPermissions.get.useQuery(
    { resellerId: permissionTarget?.id ?? 0 },
    { enabled: Boolean(permissionTarget) },
  );
  const savePermissionsMut = trpc.resellerPermissions.set.useMutation({
    onSuccess: () => toast.success("Permissões atualizadas para esta revenda."),
    onError: (error) => toast.error(error.message),
  });
  const selectedPermissions = (permissionData?.permissions ?? []) as string[];
  const togglePermission = (permission: string) => {
    if (!permissionTarget) return;
    const next = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(item => item !== permission)
      : [...selectedPermissions, permission];
    savePermissionsMut.mutate({ resellerId: permissionTarget.id, permissions: next });
  };
  const { data: appAccessData, isLoading: appAccessLoading } = trpc.resellerAppAccess.get.useQuery(
    { resellerId: appAccessTarget?.id ?? 0 },
    { enabled: Boolean(appAccessTarget) },
  );
  const { data: inviteAppAccessData, isLoading: inviteAppsLoading } = trpc.resellerAppAccess.get.useQuery(
    { resellerId: inviteTarget?.id ?? 0 },
    { enabled: Boolean(inviteTarget) },
  );
  const saveAppAccessMut = trpc.resellerAppAccess.set.useMutation({
    onSuccess: () => { toast.success("Aplicativos liberados para esta revenda."); utils.resellerAppAccess.get.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const selectedApps = (appAccessData?.allowedApps ?? []) as string[];
  const toggleAllowedApp = (appId: string) => {
    if (!appAccessTarget) return;
    const next = selectedApps.includes(appId) ? selectedApps.filter((item) => item !== appId) : [...selectedApps, appId];
    if (next.length === 0) { toast.error("Libere pelo menos um aplicativo para a revenda."); return; }
    saveAppAccessMut.mutate({ resellerId: appAccessTarget.id, allowedApps: next });
  };
  useEffect(() => {
    if (!inviteTarget) return;
    setInviteApps((inviteAppAccessData?.allowedApps ?? []) as string[]);
    setInviteLink("");
  }, [inviteTarget?.id, inviteAppAccessData?.allowedApps]);
  const createStoreInviteMut = trpc.storeInvites.create.useMutation({
    onSuccess: (result) => { setInviteLink(`${window.location.origin}/convite/${result.token}`); toast.success("Convite privado da revenda criado."); },
    onError: (error) => toast.error(error.message),
  });
  const openQuickInvite = (target: { id: number; name: string }) => {
    setInviteTarget(target);
    setInviteLink("");
    setInviteExpiresAt(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  };
  const toggleInviteApp = (appId: string) => setInviteApps((current) => current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]);
  const createQuickInvite = () => {
    if (!inviteTarget || !inviteApps.length) { toast.error("Selecione pelo menos um aplicativo para o convite."); return; }
    createStoreInviteMut.mutate({ recipientType: "revenda", resellerId: inviteTarget.id, label: inviteTarget.name, allowedApps: inviteApps, expiresAt: new Date(`${inviteExpiresAt}T23:59:59`).toISOString() });
  };
  const copyInviteLink = async () => {
    try { await navigator.clipboard.writeText(inviteLink); toast.success("Link copiado."); }
    catch { toast.error("Não foi possível copiar o link automaticamente."); }
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? "",
      email: r.email ?? "",
      password: "",
      plano: r.plano ?? "Revenda",
      planValidade: toDateOnly(r.planValidade),
      limiteDevices: r.limiteDevices ?? 50,
      limiteRevendas: r.limiteRevendas ?? 0,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Nome e email são obrigatórios"); return; }
    if (!editId && form.password.length < 8) { toast.error("Informe uma senha inicial de pelo menos 8 caracteres"); return; }
    if (editId) {
      const { password, ...revendaData } = form;
      updateMut.mutate({
        id: editId,
        ...revendaData,
        planValidade: form.planValidade || undefined,
        ...(password.trim() ? { password } : {}),
      });
    } else {
      createMut.mutate({ ...form, planValidade: form.planValidade || undefined });
    }
  };

  const totalRevendas = stats?.totalRevendas ?? 0;
  const limiteRevendas = (planInfo as any)?.limiteRevendas ?? 0;

  return (
    <AdminLayout title="Revendas">
      {/* Stats */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalRevendas}</p>
                <p className="text-xs text-muted-foreground">
                  Revendas {limiteRevendas > 0 ? `/ ${limiteRevendas}` : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Smartphone size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.totalDevices ?? 0}</p>
                <p className="text-xs text-muted-foreground">Devices das Revendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Users size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{planInfo?.plano ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Seu plano</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 mb-5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar revenda..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {/* Filtro de status */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-1">
          {(["all", "active", "blocked"] as const).map(s => (
            <Button
              key={s}
              size="sm"
              className={`h-8 px-3 text-xs ${
                filterStatus === s ? "btn-selected" : "btn-all"
              }`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Bloqueados"}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2 sm:ml-auto btn-new-resale">
          <Plus size={15} />
          Nova Revenda
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href="/relatorio-revendas"><BarChart3 size={15} /> Ranking</Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de Revendas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma revenda cadastrada</p>
              <p className="text-xs mt-1">Clique em "Nova Revenda" para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plano</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Limite</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Validade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Clientes</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{r.plano ?? "Revenda"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.limiteDevices ?? 0} devices</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatDateOnlyPtBr(r.planValidade)}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                          <Smartphone size={12} className="text-muted-foreground" />
                          {(r as any).clientCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.isActive ? "default" : "destructive"} className="text-xs">
                          {r.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Edit2 size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:text-primary" title="Permissões desta revenda" onClick={() => setPermissionTarget({ id: r.id, name: r.name ?? r.email ?? "Revenda" })}>
                            <Shield size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-cyan-600 hover:text-cyan-700" title="Aplicativos liberados no plano" onClick={() => setAppAccessTarget({ id: r.id, name: r.name ?? r.email ?? "Revenda" })}>
                            <Smartphone size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600 hover:text-indigo-700" title="Criar convite privado desta revenda" onClick={() => openQuickInvite({ id: r.id, name: r.name ?? r.email ?? "Revenda" })}>
                            <Link2 size={13} />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className={`h-7 w-7 ${r.isActive ? "text-orange-500 hover:text-orange-600" : "text-green-500 hover:text-green-600"}`}
                            title={r.isActive ? "Bloquear revenda" : "Desbloquear revenda"}
                            disabled={toggleBlockMut.isPending}
                            onClick={() => toggleBlockMut.mutate({ id: r.id, block: !!r.isActive })}
                          >
                            {r.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex flex-col gap-3 mt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{data?.total} revendas no total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page * 20 >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Revenda" : "Nova Revenda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da revenda" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Email</Label>
              <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" type="email" required />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">{editId ? "Nova senha (opcional)" : "Senha inicial *"}</Label>
              <Input value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editId ? "Deixe em branco para manter" : "Mínimo de 8 caracteres"} type="password" name="reseller-access-password" autoComplete="off" data-lpignore="true" data-1p-ignore="true" spellCheck={false} />
              <p className="mt-1 text-xs text-muted-foreground">Senha de acesso da revenda. Somente você pode criar ou alterar esta senha.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Plano</Label>
                <Select value={form.plano} onValueChange={(v) => setForm(f => ({ ...f, plano: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revenda">Revenda</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Ultra Master">Ultra Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Validade</Label>
                <Input type="date" value={form.planValidade} onChange={(e) => setForm(f => ({ ...f, planValidade: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Limite Devices</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.limiteDevices}
                  onChange={(e) => setForm(f => ({ ...f, limiteDevices: parseInt(e.target.value) || 50 }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Limite Revendas</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.limiteRevendas}
                  onChange={(e) => setForm(f => ({ ...f, limiteRevendas: parseInt(e.target.value) || 0 }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            {editId && <Button variant="outline" type="button" className="gap-2" onClick={() => setPermissionTarget({ id: editId, name: form.name || form.email || "Revenda" })}><Shield size={14} /> Permissões</Button>}
            {editId && <Button variant="outline" type="button" className="gap-2" onClick={() => setAppAccessTarget({ id: editId, name: form.name || form.email || "Revenda" })}><Smartphone size={14} /> Aplicativos</Button>}
            {editId && <Button variant="outline" type="button" className="gap-2" onClick={() => openQuickInvite({ id: editId, name: form.name || form.email || "Revenda" })}><Link2 size={14} /> Convite</Button>}
            <Button className="btn-save" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(permissionTarget)} onOpenChange={(open) => !open && setPermissionTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permissões de {permissionTarget?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Marque somente as ferramentas que você quer liberar para esta conta. As demais continuam ocultas e bloqueadas.</p>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {permissionsLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div> : RESELLER_PERMISSION_CATALOG.map(permission => {
              const active = selectedPermissions.includes(permission.key);
              return <button key={permission.key} type="button" onClick={() => togglePermission(permission.key)} disabled={savePermissionsMut.isPending} className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? "border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black" : "border-border hover:bg-muted/50"}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${active ? "border-white bg-white text-black dark:border-black dark:bg-black dark:text-white" : "border-muted-foreground/40"}`}>{active ? "✓" : ""}</div>
                  <div><p className="font-medium">{permission.label}</p><p className={`mt-0.5 text-xs ${active ? "text-white/85 dark:text-black/70" : "text-muted-foreground"}`}>{permission.description}</p></div>
                </div>
              </button>;
            })}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPermissionTarget(null)}>Concluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(appAccessTarget)} onOpenChange={(open) => !open && setAppAccessTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicativos do plano — {appAccessTarget?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha os aplicativos que esta revenda poderá cadastrar e configurar. Você pode liberar 1, 2, 3 ou mais, conforme o plano.</p>
          {appAccessData?.isLegacyAllApps && <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">Esta revenda está no padrão antigo, com todos os aplicativos liberados. Ao marcar ou desmarcar um item, você define o plano sem mexer nos clientes já cadastrados.</div>}
          <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {appAccessLoading ? <div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin" /></div> : Object.values(MANAGED_APP_CATALOG).map((app) => {
              const active = selectedApps.includes(app.id);
              return <button key={app.id} type="button" onClick={() => toggleAllowedApp(app.id)} disabled={saveAppAccessMut.isPending} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-cyan-600 bg-cyan-50 text-cyan-950 shadow-sm dark:border-cyan-400 dark:bg-cyan-950/30 dark:text-cyan-50" : "border-border hover:bg-muted/50"}`}>
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${active ? "border-cyan-600 bg-cyan-600 text-white" : "border-muted-foreground/40"}`}>{active ? "✓" : ""}</div>
                <img src={app.defaultLogoUrl} alt="" className="h-9 w-9 rounded-lg border bg-muted object-cover" />
                <span className="font-medium">{app.displayName}</span>
              </button>;
            })}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAppAccessTarget(null)}>Concluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(inviteTarget)} onOpenChange={(open) => !open && setInviteTarget(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Convite privado de {inviteTarget?.name}</DialogTitle></DialogHeader>
          {inviteLink ? <div className="space-y-4"><p className="text-sm text-muted-foreground">O link mostra somente os aplicativos selecionados para esta revenda. Copie-o antes de fechar esta janela.</p><div className="flex gap-2"><Input value={inviteLink} readOnly className="font-mono text-xs" /><Button onClick={copyInviteLink} className="gap-1"><Copy size={15} /> Copiar</Button></div></div> : <div className="space-y-4"><p className="text-sm text-muted-foreground">Os aplicativos abaixo vieram do plano desta revenda. Você pode ajustar a seleção somente para este convite.</p><div><Label className="text-xs font-medium">Validade do link</Label><Input type="date" value={inviteExpiresAt} onChange={(event) => setInviteExpiresAt(event.target.value)} className="mt-1 max-w-xs" /></div><div className="grid gap-2 sm:grid-cols-2">{Object.values(MANAGED_APP_CATALOG).map((app) => { const selected = inviteApps.includes(app.id); return <button type="button" key={app.id} onClick={() => toggleInviteApp(app.id)} disabled={inviteAppsLoading} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-muted/50"}`}><span className={`grid h-5 w-5 place-items-center rounded border text-xs ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-muted-foreground/40"}`}>{selected ? "✓" : ""}</span><img src={app.defaultLogoUrl} alt="" className="h-8 w-8 rounded-lg border bg-muted object-cover" /><span className="font-medium">{app.displayName}</span></button>; })}</div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setInviteTarget(null)}>{inviteLink ? "Fechar" : "Cancelar"}</Button>{!inviteLink && <Button onClick={createQuickInvite} disabled={createStoreInviteMut.isPending || inviteAppsLoading} className="gap-2">{createStoreInviteMut.isPending && <Loader2 size={15} className="animate-spin" />}<Link2 size={15} /> Criar link da revenda</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-destructive">⚠️</span> Confirmar Exclusão e Bloqueio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Esta ação irá realizar o seguinte <strong>imediatamente</strong>:</p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5 text-sm">
              <p className="flex items-center gap-2"><span className="text-red-500">✕</span> Bloquear <strong>todos os usuários</strong> vinculados a esta revenda</p>
              <p className="flex items-center gap-2"><span className="text-red-500">✕</span> Bloquear <strong>todas as sub-revendas</strong> e seus usuários (cascata)</p>
              <p className="flex items-center gap-2"><span className="text-red-500">✕</span> Remover permanentemente a conta da revenda</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-3 text-xs text-yellow-800 dark:text-yellow-200">
              🔒 Os usuários bloqueados verão no app: <em>"Acesso bloqueado. Entre em contato com seu revendedor para renovar o plano."</em>
            </div>
            <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMut.mutate({ id: deleteId })} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Bloquear e Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
