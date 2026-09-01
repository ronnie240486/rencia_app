import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Loader2, MessageCircle, Mic, MicOff, Pencil, Plus, Power, RefreshCw, Search, Server, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { normalizeVoiceSearchTranscript } from "@/lib/voiceSearch";
import { matchesIptvServerSearch } from "@/lib/iptvServerSearch";

type Draft = { id?: number; personName: string; personPhone: string; name: string; server: string; playlist: string; notes: string; paymentStatus: "paid" | "unpaid"; valor: string; expiresAt: string; reminderDays: number; isActive: boolean };
const emptyDraft = (): Draft => ({ personName: "", personPhone: "", name: "", server: "", playlist: "", notes: "", paymentStatus: "unpaid", valor: "0.00", expiresAt: "", reminderDays: 3, isActive: true });

type VoiceRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
};
type VoiceRecognitionConstructor = new () => VoiceRecognition;

function toDateInput(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function expirationLabel(days: number) {
  if (days < 0) return `${Math.abs(days)} dia(s) vencido`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

export default function IptvServers() {
  const utils = trpc.useUtils();
  const overview = trpc.iptvServers.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [activeTab, setActiveTab] = useState("cadastro");
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);

  const create = trpc.iptvServers.create.useMutation({ onSuccess: async () => { await Promise.all([utils.iptvServers.overview.invalidate(), utils.devices.stats.invalidate()]); toast.success("Servidor cadastrado."); setDialogOpen(false); } });
  const update = trpc.iptvServers.update.useMutation({ onSuccess: async () => { await Promise.all([utils.iptvServers.overview.invalidate(), utils.devices.stats.invalidate()]); toast.success("Servidor atualizado."); setDialogOpen(false); } });
  const setPaymentStatus = trpc.iptvServers.setPaymentStatus.useMutation({ onSuccess: async (_, variables) => { await Promise.all([utils.iptvServers.overview.invalidate(), utils.devices.stats.invalidate()]); toast.success(variables.paymentStatus === "paid" ? "Servidor marcado como pago." : "Servidor marcado como não pago."); } });
  const remove = trpc.iptvServers.remove.useMutation({ onSuccess: async () => { await Promise.all([utils.iptvServers.overview.invalidate(), utils.devices.stats.invalidate()]); toast.success("Servidor removido."); } });
  const runAlerts = trpc.iptvServers.runAlertsNow.useMutation({ onSuccess: async (result) => { await utils.iptvServers.overview.invalidate(); toast.success(result.created ? `${result.created} aviso(s) criado(s).` : "Nenhum aviso novo para criar hoje."); } });
  const enableAlerts = trpc.iptvServers.enableDailyAlerts.useMutation({ onSuccess: async () => { await utils.iptvServers.overview.invalidate(); toast.success("Avisos diários ativados."); } });
  const disableAlerts = trpc.iptvServers.disableDailyAlerts.useMutation({ onSuccess: async () => { await utils.iptvServers.overview.invalidate(); toast.success("Avisos diários pausados."); } });
  const prepareWhatsApp = trpc.iptvServers.prepareWhatsApp.useMutation({ onSuccess: async ({ url }) => { await utils.iptvServers.overview.invalidate(); window.open(url, "_blank", "noopener,noreferrer"); } });
  const prepareWhatsAppBusiness = trpc.iptvServers.prepareWhatsAppBusiness.useMutation({ onSuccess: async (result) => { await utils.iptvServers.overview.invalidate(); toast.success(result.message); } });
  const clearAlertHistory = trpc.iptvServers.clearAlertHistory.useMutation({ onSuccess: async (result) => { await utils.iptvServers.overview.invalidate(); toast.success(result.cleared ? `${result.cleared} mensagem(ns) apagada(s).` : "Não havia mensagens para apagar."); } });

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredServers = useMemo(() => (overview.data?.servers ?? []).filter((server) => matchesIptvServerSearch(server, normalizedSearch)), [normalizedSearch, overview.data?.servers]);
  const filteredExpiring = useMemo(() => (overview.data?.expiring ?? []).filter((server) => matchesIptvServerSearch(server, normalizedSearch)), [normalizedSearch, overview.data?.expiring]);
  const hasDailySchedule = Boolean(overview.data?.setting?.enabled && overview.data?.setting?.scheduleCronTaskUid);
  const isSaving = create.isPending || update.isPending;

  const startVoiceSearch = () => {
    const speechWindow = window as Window & typeof globalThis & { SpeechRecognition?: VoiceRecognitionConstructor; webkitSpeechRecognition?: VoiceRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { toast.error("Busca por voz indisponível. Use o Chrome atualizado ou digite a busca."); return; }
    voiceRecognitionRef.current?.abort();
    const recognition = new Recognition();
    voiceRecognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => { setIsListening(false); voiceRecognitionRef.current = null; };
    recognition.onerror = (event) => { if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Libere o microfone para usar a busca por voz." : "Não foi possível entender. Tente falar o servidor novamente."); };
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index]?.[0]?.transcript ?? "").join(" ");
      const term = normalizeVoiceSearchTranscript(transcript);
      if (term) setSearchTerm(term);
    };
    recognition.start();
  };

  const openCreate = () => { setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (server: NonNullable<typeof overview.data>["servers"][number]) => {
    setDraft({ id: server.id, personName: server.personName ?? "", personPhone: server.personPhone ?? "", name: server.name, server: server.server, playlist: server.playlist ?? "", notes: server.notes ?? "", paymentStatus: server.paymentStatus, valor: String(server.valor ?? "0.00"), expiresAt: toDateInput(server.expiresAt), reminderDays: server.reminderDays, isActive: server.isActive });
    setDialogOpen(true);
  };
  const submit = () => {
    const normalizedValor = Number(draft.valor.replace(",", "."));
    if (!draft.personName.trim() || !draft.personPhone.trim() || !draft.name.trim() || !draft.server.trim() || !draft.expiresAt) { toast.error("Preencha pessoa, telefone, servidor, endereço e vencimento."); return; }
    if (!Number.isFinite(normalizedValor) || normalizedValor < 0) { toast.error("Informe um valor válido."); return; }
    const values = { ...draft, valor: normalizedValor, personName: draft.personName.trim(), personPhone: draft.personPhone.trim(), name: draft.name.trim(), server: draft.server.trim(), playlist: draft.playlist.trim(), notes: draft.notes.trim() };
    if (draft.id) update.mutate({ ...values, id: draft.id });
    else create.mutate({ personName: values.personName, personPhone: values.personPhone, name: values.name, server: values.server, playlist: values.playlist, notes: values.notes, paymentStatus: values.paymentStatus, valor: values.valor, expiresAt: values.expiresAt, reminderDays: values.reminderDays });
  };

  if (dialogOpen) return <AdminLayout title={draft.id ? "Editar servidor" : "Cadastrar servidor"}>
    <div className="mx-auto min-h-full max-w-lg bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Voltar</Button><div className="min-w-0"><h1 className="truncate text-base font-bold">{draft.id ? "Editar servidor" : "Cadastrar servidor"}</h1><p className="text-xs text-muted-foreground">Cadastro independente do painel de clientes.</p></div></div>
      </header>
      <div className="space-y-4 px-4 py-5 pb-6">
        <div className="grid gap-2"><Label htmlFor="server-person">Nome da pessoa</Label><Input id="server-person" value={draft.personName} onChange={(event) => setDraft((value) => ({ ...value, personName: event.target.value }))} placeholder="Ex.: João Silva" /></div>
        <div className="grid gap-2"><Label htmlFor="server-phone">Telefone da pessoa</Label><Input id="server-phone" inputMode="tel" value={draft.personPhone} onChange={(event) => setDraft((value) => ({ ...value, personPhone: event.target.value }))} placeholder="Ex.: (11) 99999-1234" /><p className="text-xs text-muted-foreground">A mensagem pronta será aberta para este número.</p></div>
        <div className="grid gap-2"><Label htmlFor="server-name">Servidor</Label><Input id="server-name" value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder="Ex.: Club Epic Elite" /></div>
        <div className="grid gap-2"><Label htmlFor="server-address">Servidor</Label><Input id="server-address" value={draft.server} onChange={(event) => setDraft((value) => ({ ...value, server: event.target.value }))} placeholder="Ex.: https://servidor.exemplo.com" /></div>
        <div className="grid gap-2"><Label htmlFor="server-notes">Observação</Label><textarea id="server-notes" value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} placeholder="Ex.: Renovar pelo WhatsApp antes do vencimento" className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring" /></div>
        <div className="grid gap-2"><Label htmlFor="server-value">Valor</Label><Input id="server-value" type="number" min="0" step="0.01" inputMode="decimal" value={draft.valor} onChange={(event) => setDraft((value) => ({ ...value, valor: event.target.value }))} placeholder="Ex.: 30.00" /><p className="text-xs text-muted-foreground">Esse valor será somado à Receita da Home.</p></div>
        <div className="grid gap-2"><Label>Pagamento</Label><div className="grid grid-cols-2 gap-2"><Button type="button" variant={draft.paymentStatus === "paid" ? "default" : "outline"} className={draft.paymentStatus === "paid" ? "bg-emerald-600 hover:bg-emerald-700" : ""} onClick={() => setDraft((value) => ({ ...value, paymentStatus: "paid" }))}>Pago</Button><Button type="button" variant={draft.paymentStatus === "unpaid" ? "default" : "outline"} className={draft.paymentStatus === "unpaid" ? "bg-amber-600 hover:bg-amber-700" : ""} onClick={() => setDraft((value) => ({ ...value, paymentStatus: "unpaid" }))}>Não pago</Button></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="server-expiration">Vencimento</Label><Input id="server-expiration" type="date" value={draft.expiresAt} onChange={(event) => setDraft((value) => ({ ...value, expiresAt: event.target.value }))} /></div><div className="grid gap-2"><Label htmlFor="server-reminder">Avisar antes</Label><Input id="server-reminder" type="number" min={0} max={30} value={draft.reminderDays} onChange={(event) => setDraft((value) => ({ ...value, reminderDays: Math.min(30, Math.max(0, Number(event.target.value) || 0)) }))} /><p className="text-xs text-muted-foreground">Quantidade de dias.</p></div></div>
        {draft.id && <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-medium">Servidor ativo</p><p className="text-xs text-muted-foreground">Pausado não gera avisos.</p></div><Switch checked={draft.isActive} onCheckedChange={(checked) => setDraft((value) => ({ ...value, isActive: checked }))} /></div>}
      </div>
      <div className="sticky bottom-0 border-t bg-background px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"><div className="mx-auto grid max-w-lg grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="button" onClick={submit} disabled={isSaving} className="btn-save gap-2">{isSaving && <Loader2 className="animate-spin" size={15} />} Salvar</Button></div></div>
    </div>
  </AdminLayout>;

  return <AdminLayout title="Servidores IPTV">
    <div className="mx-auto max-w-6xl space-y-5 p-1 sm:p-3">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Server size={24} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Controle independente</p><h1 className="mt-1 text-2xl font-black">Central de Servidores IPTV</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Organize somente nome, endereço e vencimento. Esta área não acessa nem altera clientes, MACs, listas ou aplicativos.</p></div></div>
          <Button onClick={openCreate} className="btn-save gap-2"><Plus size={16} /> Cadastrar servidor</Button>
        </div>
        <p className="mt-4 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">Área separada: os servidores cadastrados aqui ficam somente em <strong>Operação → Servidores IPTV</strong> e não aparecem na lista de Usuários.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><Server className="text-primary" /><div><p className="text-2xl font-black">{overview.data?.servers.length ?? 0}</p><p className="text-xs text-muted-foreground">Servidores cadastrados</p></div></CardContent></Card>
        <Card className={(overview.data?.expiring.length ?? 0) > 0 ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10" : ""}><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className={(overview.data?.expiring.length ?? 0) > 0 ? "text-amber-600" : "text-muted-foreground"} /><div><p className="text-2xl font-black">{overview.data?.expiring.length ?? 0}</p><p className="text-xs text-muted-foreground">Precisam de atenção</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><CalendarClock className={hasDailySchedule ? "text-emerald-600" : "text-muted-foreground"} /><div><p className="text-sm font-bold">{hasDailySchedule ? "Aviso diário ativo" : "Aviso diário pausado"}</p><p className="text-xs text-muted-foreground">No painel às 9h</p></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="cadastro">Cadastro</TabsTrigger><TabsTrigger value="conferir">Conferir servidores</TabsTrigger><TabsTrigger value="vencimentos">Vencimentos {overview.data?.expiring.length ? <Badge className="ml-1.5 bg-amber-500 text-black">{overview.data.expiring.length}</Badge> : null}</TabsTrigger></TabsList>
        <TabsContent value="cadastro" className="space-y-4">
          <Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus size={18} /> Cadastro de servidor</CardTitle><CardDescription>Cadastre um novo servidor nesta aba. Para localizar ou editar os mais de 500 registros, use a aba Conferir servidores.</CardDescription></CardHeader><CardContent><Button onClick={openCreate} className="btn-save gap-2"><Plus size={16} /> Cadastrar servidor</Button></CardContent></Card>
          <Card className="border-primary/20"><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><CalendarClock /> Avisos automáticos</CardTitle><CardDescription>O painel verifica os vencimentos diariamente e cria um alerta uma vez por dia para cada servidor.</CardDescription></div><div className="flex flex-wrap gap-2">{hasDailySchedule ? <Button variant="outline" size="sm" onClick={() => disableAlerts.mutate()} disabled={disableAlerts.isPending} className="gap-1.5"><Power size={15} /> Pausar</Button> : <Button size="sm" onClick={() => enableAlerts.mutate()} disabled={enableAlerts.isPending} className="gap-1.5 text-black"><CheckCircle2 size={15} /> Ativar avisos</Button>}</div></CardHeader><CardContent className="space-y-3"><p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">A mensagem do WhatsApp já fica pronta para abrir e enviar. O envio automático por WhatsApp Business poderá ser ativado depois, sem recriar os servidores.</p><div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">WhatsApp Business</p><p className="text-xs text-muted-foreground">A conexão oficial será configurada depois com o número e a chave da conta Business; seus servidores atuais serão aproveitados.</p></div><div className="flex items-center gap-2"><Badge variant={overview.data?.whatsappBusiness.status === "active" ? "default" : overview.data?.whatsappBusiness.status === "ready" ? "secondary" : "outline"}>{overview.data?.whatsappBusiness.status === "active" ? "Ativo" : overview.data?.whatsappBusiness.status === "ready" ? "Preparado" : "Aguardando conexão"}</Badge>{overview.data?.whatsappBusiness.status === "not_configured" && <Button variant="outline" size="sm" onClick={() => prepareWhatsAppBusiness.mutate()} disabled={prepareWhatsAppBusiness.isPending}>Preparar</Button>}</div></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="conferir" className="space-y-4">
          <Card><CardHeader className="gap-3"><div><CardTitle className="text-base">Conferir servidores</CardTitle><CardDescription>Use esta aba para buscar por pessoa ou servidor e editar rapidamente entre centenas de cadastros.</CardDescription></div><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por pessoa ou servidor" className="h-10 pl-10 pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={startVoiceSearch} disabled={isListening} title="Buscar por voz" aria-label="Buscar por voz">{isListening ? <MicOff className="animate-pulse text-destructive" size={17} /> : <Mic size={17} />}</Button></div>{searchTerm && <p className="text-xs text-muted-foreground">{filteredServers.length} resultado(s) encontrado(s).</p>}</CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Pessoa</th><th className="px-5 py-3">Telefone</th><th className="px-5 py-3">Servidor</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Pagamento</th><th className="px-5 py-3">Observação</th><th className="px-5 py-3 text-right">Ações</th></tr></thead><tbody>{filteredServers.map((server) => { const alert = overview.data?.expiring.find((item) => item.id === server.id); const days = alert?.daysUntilExpiration; const isPaid = server.paymentStatus === "paid"; const hasPhone = Boolean(server.personPhone?.trim()); return <tr key={server.id} className="border-b last:border-0"><td className="px-5 py-4"><p className="font-semibold">{server.personName || "Não informado"}</p><Badge variant={server.isActive ? "secondary" : "outline"} className="mt-1 text-[10px]">{server.isActive ? "Ativo" : "Pausado"}</Badge></td><td className="px-5 py-4 font-mono text-xs">{server.personPhone || "—"}</td><td className="max-w-[280px] px-5 py-4"><p className="truncate font-mono text-xs" title={server.server}>{server.server}</p></td><td className="px-5 py-4 whitespace-nowrap">R$ {Number(server.valor ?? 0).toFixed(2).replace(".", ",")}</td><td className="px-5 py-4"><p>{new Date(server.expiresAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>{typeof days === "number" ? <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">{expirationLabel(days)}</p> : <p className="mt-1 text-xs text-muted-foreground">Avisar {server.reminderDays} dia(s) antes</p>}</td><td className="px-5 py-4"><Button size="sm" variant={isPaid ? "outline" : "default"} className={isPaid ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : ""} onClick={() => setPaymentStatus.mutate({ id: server.id, paymentStatus: isPaid ? "unpaid" : "paid" })} disabled={setPaymentStatus.isPending}><CircleDollarSign size={15} className="mr-1" />{isPaid ? "Pago" : "Não pago"}</Button></td><td className="max-w-[190px] px-5 py-4"><p className="truncate text-xs text-muted-foreground" title={server.notes ?? ""}>{server.notes || "—"}</p></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title={hasPhone ? "Abrir mensagem no WhatsApp" : "Cadastre o telefone da pessoa para enviar mensagem"} onClick={() => prepareWhatsApp.mutate({ id: server.id })} disabled={prepareWhatsApp.isPending || !hasPhone}><MessageCircle size={16} /></Button><Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(server)}><Pencil size={16} /></Button><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" title="Remover" onClick={() => { if (window.confirm(`Remover o servidor ${server.name}?`)) remove.mutate({ id: server.id }); }} disabled={remove.isPending}><Trash2 size={16} /></Button></div></td></tr>; })}{!overview.isLoading && !filteredServers.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-muted-foreground"><Server className="mx-auto mb-3 opacity-40" size={30} /><p className="font-medium">{searchTerm ? "Nenhum servidor encontrado." : "Nenhum servidor cadastrado."}</p><p className="mt-1 text-xs">{searchTerm ? "Tente outro nome ou endereço." : "Cadastre o primeiro para acompanhar os vencimentos."}</p></td></tr>}</tbody></table></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="vencimentos" className="space-y-4"><Card className="border-amber-300/60"><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="text-amber-600" size={18} /> Conferência de vencimentos</CardTitle><CardDescription>Revise todos os servidores próximos do vencimento antes de abrir as mensagens.</CardDescription></div><Button onClick={() => runAlerts.mutate()} disabled={runAlerts.isPending} className="btn-save gap-2"><RefreshCw size={16} className={runAlerts.isPending ? "animate-spin" : ""} /> Verificar agora</Button></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Filtrar vencimentos por pessoa ou servidor" className="h-10 pl-10 pr-12" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={startVoiceSearch} disabled={isListening} title="Buscar por voz" aria-label="Buscar por voz">{isListening ? <MicOff className="animate-pulse text-destructive" size={17} /> : <Mic size={17} />}</Button></div>{filteredExpiring.map((server) => <div key={server.id} className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/15 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{server.personName || server.name}</p><p className="mt-1 text-sm text-muted-foreground">{server.name} · {expirationLabel(server.daysUntilExpiration)}</p><p className="mt-1 text-xs text-muted-foreground">Vencimento: {new Date(server.expiresAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(server)}><Pencil size={15} className="mr-1" /> Editar</Button><Button size="sm" onClick={() => prepareWhatsApp.mutate({ id: server.id })} disabled={prepareWhatsApp.isPending || !server.personPhone?.trim()}><MessageCircle size={15} className="mr-1" /> Mensagem</Button></div></div>)}{!filteredExpiring.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{searchTerm ? "Nenhum vencimento encontrado para esta busca." : "Nenhum servidor precisa de atenção no período configurado."}</div>}</CardContent></Card></TabsContent>
      </Tabs>

      <Card><CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-base">Histórico de avisos</CardTitle><CardDescription>Registros gerados pela verificação automática e pela abertura de mensagens prontas.</CardDescription></div><Button variant="outline" size="sm" className="w-fit text-destructive hover:text-destructive" disabled={!overview.data?.alerts.length || clearAlertHistory.isPending} onClick={() => { if (window.confirm("Apagar todas as mensagens do histórico de servidores? Isso não apaga servidores, clientes, MACs ou listas.")) clearAlertHistory.mutate(); }}><Trash2 size={15} className="mr-1.5" /> Apagar mensagens</Button></CardHeader><CardContent className="space-y-2">{overview.data?.alerts.slice(0, 8).map((alert) => <div key={alert.id} className="flex gap-3 rounded-lg border p-3"><Clock3 className="mt-0.5 shrink-0 text-muted-foreground" size={16} /><div className="min-w-0"><p className="text-sm">{alert.message}</p><p className="mt-1 text-xs text-muted-foreground">{alert.channel === "panel" ? "Aviso no painel" : alert.channel === "whatsapp_ready" ? "Mensagem pronta para WhatsApp" : "WhatsApp Business"} · {new Date(alert.createdAt).toLocaleString("pt-BR")}</p></div></div>)}{!overview.data?.alerts.length && <p className="py-4 text-sm text-muted-foreground">Os avisos aparecerão aqui depois da primeira verificação.</p>}</CardContent></Card>
    </div>
  </AdminLayout>;
}
