import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Server, ArrowRightLeft, RefreshCw, Loader2, Copy, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DnsForm {
  titulo: string;
  host: string;
}

const emptyForm: DnsForm = { titulo: "", host: "" };

export default function DNS() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DnsForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Troca em massa
  const [oldHost, setOldHost] = useState("");
  const [newHost, setNewHost] = useState("");
  const [useDropdown, setUseDropdown] = useState(true);

  const { data: dnsList = [], isLoading, refetch } = trpc.dns.list.useQuery();
  const { data: uniqueUrls = [], refetch: refetchUrls } = trpc.devices.listUniqueUrls.useQuery();

  const createMut = trpc.dns.create.useMutation({
    onSuccess: () => { toast.success("DNS cadastrada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.dns.update.useMutation({
    onSuccess: () => { toast.success("DNS atualizada!"); setShowDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.dns.delete.useMutation({
    onSuccess: () => { toast.success("DNS removida!"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const swapMut = trpc.devices.bulkSwapDns.useMutation({
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.warning("Nenhum usuário encontrado com essa DNS.");
      } else {
        toast.success(`✅ DNS atualizada em ${data.count} usuário(s) com sucesso!`);
        setOldHost("");
        setNewHost("");
        refetchUrls();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (d: any) => { setEditId(d.id); setForm({ titulo: d.titulo, host: d.host }); setShowDialog(true); };

  const handleSave = () => {
    if (!form.titulo.trim()) return toast.error("Título é obrigatório");
    if (!form.host.trim()) return toast.error("Host é obrigatório");
    if (editId) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldHost.trim()) return toast.error("Selecione a DNS atual.");
    if (!newHost.trim()) return toast.error("Informe a nova DNS.");
    if (oldHost.trim() === newHost.trim()) return toast.error("A DNS nova deve ser diferente da atual.");
    swapMut.mutate({ oldUrl: oldHost.trim(), newUrl: newHost.trim() });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  };

  return (
    <AdminLayout title="DNS">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="w-6 h-6 text-yellow-500" />
              Gerenciar DNS
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Cadastre seus servidores DNS e aplique trocas em massa nos usuários.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
            <Plus size={16} />
            Cadastrar DNS
          </Button>
        </div>

        {/* Lista de DNS cadastradas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DNS Cadastradas ({dnsList.length})</CardTitle>
            <CardDescription>Seus servidores DNS salvos. Clique para usar na troca em massa.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : dnsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Server size={32} className="text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma DNS cadastrada ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Cadastrar DNS" para adicionar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dnsList.map((dns) => (
                  <div
                    key={dns.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <Server size={14} className="text-yellow-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{dns.titulo}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{dns.host}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => { setNewHost(dns.host); toast.info("DNS copiada para o campo 'Nova DNS'"); }}
                        title="Usar como nova DNS"
                      >
                        <ArrowRightLeft size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => copyToClipboard(dns.host)}
                        title="Copiar host"
                      >
                        <Copy size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => openEdit(dns)}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(dns.id)}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troca em Massa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft size={16} />
              Trocar DNS em Massa
            </CardTitle>
            <CardDescription>
              Substitui somente o servidor (host) da URL. O caminho da lista (<code>/get.php?username=...</code>) é mantido automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSwap} className="space-y-4">
              {/* DNS Atual */}
              <div className="space-y-2">
                <Label>DNS Atual (a ser substituída)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {useDropdown ? (
                      <Select value={oldHost} onValueChange={setOldHost}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma DNS cadastrada nos usuários" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueUrls.map((url) => (
                            <SelectItem key={url} value={url}>
                              <span className="font-mono text-xs">{url}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Ex: http://servidorantigo.com"
                        value={oldHost}
                        onChange={(e) => setOldHost(e.target.value)}
                        className="font-mono text-sm"
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setUseDropdown(!useDropdown); setOldHost(""); }}
                  >
                    {useDropdown ? "Digitar" : "Lista"}
                  </Button>
                </div>
              </div>

              {/* Nova DNS */}
              <div className="space-y-2">
                <Label>Nova DNS (somente o servidor)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: http://novoservidor.com"
                    value={newHost}
                    onChange={(e) => setNewHost(e.target.value)}
                    className="font-mono text-sm flex-1"
                  />
                  {dnsList.length > 0 && (
                    <Select value={newHost} onValueChange={setNewHost}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Da lista" />
                      </SelectTrigger>
                      <SelectContent>
                        {dnsList.map((d) => (
                          <SelectItem key={d.id} value={d.host}>
                            <span className="text-xs">{d.titulo}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Informe somente o endereço do servidor. O caminho (<code>/get.php?username=...</code>) será mantido.
                </p>
              </div>

              {/* Preview */}
              {oldHost && newHost && (
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-muted-foreground text-xs">Prévia da alteração:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-xs break-all">
                      {oldHost.length > 50 ? oldHost.slice(0, 50) + "..." : oldHost}
                    </code>
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs break-all">
                      {newHost.length > 50 ? newHost.slice(0, 50) + "..." : newHost}
                    </code>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                disabled={swapMut.isPending || !oldHost || !newHost}
              >
                {swapMut.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Atualizando...</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4 mr-2" /> Trocar DNS em Massa</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* Dialog Cadastrar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar DNS" : "Cadastrar Nova DNS"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título / Nome</Label>
              <Input
                placeholder="Ex: Servidor Principal, Backup 1..."
                value={form.titulo}
                onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Host (servidor)</Label>
              <Input
                placeholder="Ex: http://servidor.com ou http://servidor.com:8080"
                value={form.host}
                onChange={(e) => setForm(f => ({ ...f, host: e.target.value }))}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Informe somente o protocolo + domínio + porta. Não inclua caminhos como <code>/get.php</code>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="mr-2 animate-spin" />}
              {editId ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta DNS? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
