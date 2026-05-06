import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Edit2,
  List,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

interface ListForm {
  nome: string;
  modoSelecao: "XTeamCode" | "M3U8";
  urlM3u8: string;
  xtServer: string;
  xtUsername: string;
  xtPassword: string;
  ordem: number;
  ativo: boolean;
}

const emptyForm: ListForm = {
  nome: "Lista 1",
  modoSelecao: "XTeamCode",
  urlM3u8: "",
  xtServer: "",
  xtUsername: "",
  xtPassword: "",
  ordem: 0,
  ativo: true,
};

export default function DeviceLists() {
  const { id } = useParams<{ id: string }>();
  const deviceId = parseInt(id ?? "0");

  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ListForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: device } = trpc.devices.getById.useQuery({ id: deviceId }, { enabled: !!deviceId });
  const { data: lists, isLoading, refetch } = trpc.deviceUrls.list.useQuery({ deviceId }, { enabled: !!deviceId });

  const addMut = trpc.deviceUrls.add.useMutation({
    onSuccess: () => { toast.success("Lista adicionada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.deviceUrls.update.useMutation({
    onSuccess: () => { toast.success("Lista atualizada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.deviceUrls.delete.useMutation({
    onSuccess: () => { toast.success("Lista removida!"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, nome: `Lista ${(lists?.length ?? 0) + 1}`, ordem: lists?.length ?? 0 });
    setShowDialog(true);
  };
  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({
      nome: l.nome ?? "Lista",
      modoSelecao: l.modoSelecao ?? "XTeamCode",
      urlM3u8: l.urlM3u8 ?? "",
      xtServer: l.xtServer ?? "",
      xtUsername: l.xtUsername ?? "",
      xtPassword: l.xtPassword ?? "",
      ordem: l.ordem ?? 0,
      ativo: l.ativo ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.modoSelecao === "M3U8" && !form.urlM3u8.trim()) { toast.error("URL M3U8 é obrigatória"); return; }
    if (form.modoSelecao === "XTeamCode" && !form.xtServer.trim()) { toast.error("URL do servidor é obrigatória"); return; }

    const payload = {
      nome: form.nome,
      modoSelecao: form.modoSelecao,
      urlM3u8: form.modoSelecao === "M3U8" ? form.urlM3u8 : undefined,
      xtServer: form.modoSelecao === "XTeamCode" ? form.xtServer : undefined,
      xtUsername: form.modoSelecao === "XTeamCode" ? form.xtUsername : undefined,
      xtPassword: form.modoSelecao === "XTeamCode" ? form.xtPassword : undefined,
      ordem: form.ordem,
    };

    if (editId) {
      updateMut.mutate({ id: editId, deviceId, ...payload, ativo: form.ativo });
    } else {
      addMut.mutate({ deviceId, ...payload });
    }
  };

  return (
    <AdminLayout title={`Listas — ${device?.nomeServer ?? "Device"}`}>
      {/* Voltar */}
      <div className="mb-5">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft size={15} />
            Voltar para Usuários
          </Button>
        </Link>
      </div>

      {/* Info do device */}
      {device && (
        <Card className="mb-5 border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">MAC</p>
                <p className="font-mono text-sm font-semibold">{device.mac}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Servidor</p>
                <p className="text-sm font-medium">{device.nomeServer}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={device.status === "Liberado" ? "default" : "destructive"} className="text-xs">
                  {device.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Listas</p>
                <p className="text-sm font-medium">{lists?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Listas de Reprodução</h2>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus size={14} />
          Adicionar Lista
        </Button>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (lists?.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <List size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma lista cadastrada</p>
              <p className="text-xs mt-1">Clique em "Adicionar Lista" para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {lists?.map((l, idx) => (
                <div key={l.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{l.nome}</p>
                      <Badge variant="outline" className="text-xs">{l.modoSelecao}</Badge>
                      {!l.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {l.modoSelecao === "M3U8"
                        ? l.urlM3u8 ?? "—"
                        : l.xtServer ? `${l.xtServer} • ${l.xtUsername ?? "—"}` : "—"
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                      <Edit2 size={13} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(l.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Lista" : "Nova Lista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Nome da Lista *</Label>
                <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Lista Principal" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Tipo</Label>
                <Select value={form.modoSelecao} onValueChange={(v: "XTeamCode" | "M3U8") => setForm(f => ({ ...f, modoSelecao: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XTeamCode">XTeamCode</SelectItem>
                    <SelectItem value="M3U8">M3U8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.modoSelecao === "M3U8" && (
              <div>
                <Label className="text-xs font-medium mb-1.5 block">URL M3U8 *</Label>
                <Input
                  value={form.urlM3u8}
                  onChange={(e) => setForm(f => ({ ...f, urlM3u8: e.target.value }))}
                  placeholder="http://servidor.com/lista.m3u8"
                />
              </div>
            )}

            {form.modoSelecao === "XTeamCode" && (
              <>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">URL do Servidor *</Label>
                  <Input
                    value={form.xtServer}
                    onChange={(e) => setForm(f => ({ ...f, xtServer: e.target.value }))}
                    placeholder="http://servidor.com:8080"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Usuário</Label>
                    <Input
                      value={form.xtUsername}
                      onChange={(e) => setForm(f => ({ ...f, xtUsername: e.target.value }))}
                      placeholder="usuario"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Senha</Label>
                    <Input
                      value={form.xtPassword}
                      onChange={(e) => setForm(f => ({ ...f, xtPassword: e.target.value }))}
                      placeholder="senha"
                      type="password"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                  className="h-9 text-sm"
                />
              </div>
              {editId && (
                <div className="flex items-center gap-3 pt-5">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm(f => ({ ...f, ativo: v }))}
                  />
                  <Label className="text-xs font-medium">Ativo</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={addMut.isPending || updateMut.isPending}>
              {(addMut.isPending || updateMut.isPending) && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editId ? "Salvar" : "Adicionar"}
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
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta lista?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMut.mutate({ id: deleteId, deviceId })} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
