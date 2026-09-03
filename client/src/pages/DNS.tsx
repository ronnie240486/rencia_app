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
  grupo: string;
  host: string;
}

const emptyForm: DnsForm = { titulo: "", grupo: "Padrão", host: "" };

export default function DNS() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DnsForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Troca em massa
  const [oldHost, setOldHost] = useState("");
  const [newHost, setNewHost] = useState("");
  const [useDropdown, setUseDropdown] = useState(true);
  const [maintenanceGroup, setMaintenanceGroup] = useState("Padrão");
  const [maintenanceTitle, setMaintenanceTitle] = useState("Manutenção programada");
  const [maintenanceContent, setMaintenanceContent] = useState("");
  const [maintenanceStartsAt, setMaintenanceStartsAt] = useState("");
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState("");
  const [fromProfile, setFromProfile] = useState("");
  const [toProfile, setToProfile] = useState("");
  const [targetProfileDnsId, setTargetProfileDnsId] = useState("");
  const utils = trpc.useUtils();

  const { data: dnsList = [], isLoading, refetch } = trpc.dns.list.useQuery();
  const { data: uniqueUrls = [], refetch: refetchUrls } = trpc.devices.listUniqueUrls.useQuery();
  const { data: serverBlocks = [], refetch: refetchBlocks } = trpc.dns.listServerBlocks.useQuery();
  const { data: groupHealth = [], refetch: refetchGroupHealth } = trpc.dns.groupHealth.useQuery();
  const { data: swapImpact } = trpc.devices.previewBulkSwapDns.useQuery({ oldUrl: oldHost || " " }, { enabled: Boolean(oldHost.trim()) });
  const refreshDnsData = async () => {
    await Promise.all([
      refetch(),
      refetchUrls(),
      refetchBlocks(),
      refetchGroupHealth(),
      utils.devices.list.invalidate(),
      utils.devices.stats.invalidate(),
    ]);
  };

  const createMut = trpc.dns.create.useMutation({
    onSuccess: async () => { toast.success("DNS cadastrada!"); setShowDialog(false); setForm(emptyForm); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.dns.update.useMutation({
    onSuccess: async () => { toast.success("DNS atualizada!"); setShowDialog(false); setForm(emptyForm); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.dns.delete.useMutation({
    onSuccess: async () => { toast.success("DNS removida!"); setDeleteId(null); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const applyGroupMut = trpc.dns.applyGroupToDevices.useMutation({
    onSuccess: async (data) => { toast.success(`DNS aplicada a ${data.updated} cliente(s) do grupo.`); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const maintenanceNoticeMut = trpc.dns.createMaintenanceNotice.useMutation({
    onSuccess: (data) => { toast.success(`Aviso preparado para ${data.sent} painel(is).`); setMaintenanceContent(""); },
    onError: (e) => toast.error(e.message),
  });
  const serverBlockMut = trpc.dns.setServerBlock.useMutation({
    onSuccess: async () => { toast.success("Status de manutenção do servidor atualizado."); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const profileSwapMut = trpc.dns.swapProfileForDevices.useMutation({
    onSuccess: async (data) => { toast.success(`${data.updated} cliente(s) trocado(s) de ${data.fromGroup} para ${data.toGroup}.`); setFromProfile(""); setToProfile(""); setTargetProfileDnsId(""); await refreshDnsData(); },
    onError: (e) => toast.error(e.message),
  });
  const swapMut = trpc.devices.bulkSwapDns.useMutation({
    onSuccess: async (data) => {
      if (data.count === 0) {
        toast.warning("Nenhum usuário encontrado com essa DNS.");
      } else {
        toast.success(`✅ DNS atualizada em ${data.count} usuário(s) com sucesso!`);
        setOldHost("");
        setNewHost("");
        await refreshDnsData();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const profileGroups = Array.from(new Set(dnsList.map((item) => item.grupo ?? "Padrão"))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const targetProfileDns = dnsList.filter((item) => (item.grupo ?? "Padrão") === toProfile && item.ativo);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (d: any) => { setEditId(d.id); setForm({ titulo: d.titulo, grupo: d.grupo ?? "Padrão", host: d.host }); setShowDialog(true); };

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
    const impact = swapImpact?.count ?? 0;
    if (!window.confirm(`Confirma trocar a DNS de ${impact} cliente(s)? Esta ação mantém o caminho da lista e altera somente o servidor.`)) return;
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

        {groupHealth.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Saúde dos Grupos DNS</CardTitle><CardDescription>Consolidado pelas verificações recentes das listas.</CardDescription></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {groupHealth.map((group) => <div key={group.group} className="rounded-lg border p-3 space-y-2"><div className="flex items-center justify-between gap-3"><div><p className="font-medium text-sm">{group.group}</p><p className="text-xs text-muted-foreground">{group.total} teste(s) · {group.errors} falha(s)</p></div><Badge className={group.health === "healthy" ? "bg-emerald-600" : group.health === "critical" ? "bg-red-600" : group.health === "attention" ? "bg-amber-600" : "bg-slate-500"}>{group.health === "healthy" ? "Saudável" : group.health === "critical" ? "Crítico" : group.health === "attention" ? "Atenção" : "Sem testes"}</Badge></div>{group.dns?.map((dns) => <div key={dns.id} className="rounded-md bg-muted/40 px-2 py-1.5 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-medium">{dns.titulo}</span><span className={dns.status === "error" ? "text-red-600 font-medium" : dns.status === "success" ? "text-emerald-600" : "text-muted-foreground"}>{dns.status === "error" ? "Falhou" : dns.status === "success" ? "Funcionando" : "Sem teste"}</span></div><p className="font-mono text-[11px] text-muted-foreground truncate">{dns.host}</p>{dns.status === "error" && <p className="text-red-600">Falha atual: {dns.message}{dns.statusCode ? ` (HTTP ${dns.statusCode})` : ""}{dns.checkedAt ? ` · ${new Date(dns.checkedAt).toLocaleString("pt-BR")}` : ""}</p>}{dns.status !== "error" && dns.lastFailure && <p className="text-amber-700">Falhou anteriormente: {dns.lastFailure.message}{dns.lastFailure.statusCode ? ` (HTTP ${dns.lastFailure.statusCode})` : ""} · {new Date(dns.lastFailure.checkedAt).toLocaleString("pt-BR")}</p>}</div>)}</div>)}
            </CardContent>
          </Card>
        )}

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
                        <Badge variant="secondary" className="mt-1 text-[10px]">Grupo: {dns.grupo ?? "Padrão"}</Badge>
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
                      {dnsList.filter((item) => (item.grupo ?? "Padrão") === (dns.grupo ?? "Padrão")).length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
                          title={`Aplicar esta DNS a todos os clientes do grupo ${dns.grupo ?? "Padrão"}`}
                          disabled={applyGroupMut.isPending}
                          onClick={() => {
                            const group = dns.grupo ?? "Padrão";
                            if (window.confirm(`Aplicar a DNS “${dns.titulo}” para os clientes vinculados ao grupo “${group}”?`)) applyGroupMut.mutate({ grupo: group, targetDnsId: dns.id });
                          }}
                        >
                          <CheckCircle2 size={12} />
                        </Button>
                      )}
                      {(() => {
                        const blocked = serverBlocks.some((block) => block.active && block.host === dns.host.replace(/\/+$/, ""));
                        return <Button size="sm" variant="ghost" className={`h-7 px-2 ${blocked ? "text-amber-600" : "text-slate-500"}`} title={blocked ? "Liberar servidor para failover" : "Bloquear servidor no failover"} disabled={serverBlockMut.isPending} onClick={() => serverBlockMut.mutate({ host: dns.host, active: !blocked, reason: blocked ? undefined : "Bloqueado manualmente para manutenção" })}>{blocked ? "Liberar" : "Manutenção"}</Button>;
                      })()}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aviso de manutenção por grupo</CardTitle>
            <CardDescription>Cria um aviso dentro do painel das revendas afetadas. O WhatsApp poderá ser conectado depois.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Grupo de DNS</Label><Select value={maintenanceGroup} onValueChange={setMaintenanceGroup}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from(new Set(dnsList.map((item) => item.grupo ?? "Padrão"))).map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Título</Label><Input value={maintenanceTitle} onChange={(event) => setMaintenanceTitle(event.target.value)} /></div>
            <div className="space-y-2"><Label>Início</Label><Input type="datetime-local" value={maintenanceStartsAt} onChange={(event) => setMaintenanceStartsAt(event.target.value)} /></div>
            <div className="space-y-2"><Label>Término</Label><Input type="datetime-local" value={maintenanceEndsAt} onChange={(event) => setMaintenanceEndsAt(event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Mensagem</Label><Input placeholder="Ex.: Hoje às 23h faremos uma manutenção no servidor." value={maintenanceContent} onChange={(event) => setMaintenanceContent(event.target.value)} /></div>
            <div className="md:col-span-2"><Button className="text-black dark:text-white" disabled={maintenanceNoticeMut.isPending || maintenanceContent.trim().length < 3 || !maintenanceStartsAt || !maintenanceEndsAt} onClick={() => maintenanceNoticeMut.mutate({ grupo: maintenanceGroup, titulo: maintenanceTitle, conteudo: maintenanceContent, startsAt: new Date(maintenanceStartsAt), endsAt: new Date(maintenanceEndsAt) })}>{maintenanceNoticeMut.isPending ? "Enviando..." : "Programar aviso de manutenção"}</Button></div>
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
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 pt-1">
                    Impacto: {swapImpact?.count ?? "…"} cliente(s), {swapImpact?.owners ?? "…"} conta(s). A confirmação será solicitada antes de aplicar.
                  </p>
                  {swapImpact?.devices?.length ? <p className="text-xs text-muted-foreground">Exemplos: {swapImpact.devices.map((device) => `${device.nome} (${device.mac})`).join(", ")}</p> : null}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft size={16} /> Trocar perfil de servidor em massa</CardTitle>
            <CardDescription>Move os clientes de um grupo, como Club, para outro grupo, como Onix, mantendo o caminho, usuário e senha da M3U.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2"><Label>Perfil atual</Label><Select value={fromProfile} onValueChange={setFromProfile}><SelectTrigger><SelectValue placeholder="Ex.: Club" /></SelectTrigger><SelectContent>{profileGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Novo perfil</Label><Select value={toProfile} onValueChange={(value) => { setToProfile(value); setTargetProfileDnsId(""); }}><SelectTrigger><SelectValue placeholder="Ex.: Onix" /></SelectTrigger><SelectContent>{profileGroups.filter((group) => group !== fromProfile).map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>DNS principal do novo perfil</Label><Select value={targetProfileDnsId} onValueChange={setTargetProfileDnsId}><SelectTrigger><SelectValue placeholder="Escolha a DNS" /></SelectTrigger><SelectContent>{targetProfileDns.map((dns) => <SelectItem key={dns.id} value={String(dns.id)}>{dns.titulo} — {dns.host}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3"><Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={profileSwapMut.isPending || !fromProfile || !toProfile || !targetProfileDnsId} onClick={() => { if (window.confirm(`Trocar todos os clientes do perfil ${fromProfile} para ${toProfile}?`)) profileSwapMut.mutate({ fromGroup: fromProfile, toGroup: toProfile, targetDnsId: Number(targetProfileDnsId) }); }}>{profileSwapMut.isPending ? "Trocando..." : "Trocar perfil em massa"}</Button></div>
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
              <Label>Grupo</Label>
              <Input
                placeholder="Ex: Servidor A, Backup, Clientes VIP"
                value={form.grupo}
                onChange={(e) => setForm(f => ({ ...f, grupo: e.target.value }))}
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
