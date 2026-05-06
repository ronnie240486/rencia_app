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
  Edit2,
  Loader2,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RevendaForm {
  name: string;
  email: string;
  plano: string;
  planValidade: string;
  limiteDevices: number;
  limiteRevendas: number;
}

const emptyForm: RevendaForm = {
  name: "",
  email: "",
  plano: "Revenda",
  planValidade: "",
  limiteDevices: 50,
  limiteRevendas: 0,
};

export default function Revendas() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RevendaForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.revendas.list.useQuery({ search, page, pageSize: 20 });
  const { data: stats } = trpc.revendas.stats.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();

  const createMut = trpc.revendas.create.useMutation({
    onSuccess: () => { toast.success("Revenda criada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.revendas.update.useMutation({
    onSuccess: () => { toast.success("Revenda atualizada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.revendas.delete.useMutation({
    onSuccess: () => { toast.success("Revenda removida!"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? "",
      email: r.email ?? "",
      plano: r.plano ?? "Revenda",
      planValidade: r.planValidade ? new Date(r.planValidade).toISOString().split("T")[0] : "",
      limiteDevices: r.limiteDevices ?? 50,
      limiteRevendas: r.limiteRevendas ?? 0,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editId) {
      updateMut.mutate({ id: editId, ...form, planValidade: form.planValidade || undefined });
    } else {
      createMut.mutate({ ...form, planValidade: form.planValidade || undefined });
    }
  };

  const totalRevendas = stats?.totalRevendas ?? 0;
  const limiteRevendas = (planInfo as any)?.limiteRevendas ?? 0;

  return (
    <AdminLayout title="Revendas">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar revenda..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus size={15} />
          Nova Revenda
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
          ) : (data?.data?.length ?? 0) === 0 ? (
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{r.plano ?? "Revenda"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.limiteDevices ?? 0} devices</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {r.planValidade ? new Date(r.planValidade).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.isActive ? "default" : "destructive"} className="text-xs">
                          {r.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                            <Edit2 size={13} />
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
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
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
              <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta revenda? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMut.mutate({ id: deleteId })} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
