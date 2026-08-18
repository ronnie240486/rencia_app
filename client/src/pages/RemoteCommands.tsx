import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleDashed, Clock3, Loader2, MonitorCog, RefreshCw, Send, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

const commandOptions = [
  { value: "refresh_playlist", label: "Atualizar lista agora", hint: "Recarrega a playlist atual no aparelho." },
  { value: "switch_playlist", label: "Trocar lista", hint: "Aplica a Lista 1, 2 ou 3 e recarrega." },
  { value: "update_dns", label: "Atualizar DNS", hint: "Entrega a DNS informada para o aplicativo." },
  { value: "show_message", label: "Exibir aviso", hint: "Mostra uma mensagem na tela do cliente." },
  { value: "restart_player", label: "Reiniciar player", hint: "Volta para o início e recarrega as configurações." },
  { value: "sync_access", label: "Sincronizar acesso", hint: "Atualiza imediatamente a situação de bloqueio ou liberação." },
] as const;

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  queued: { label: "Na fila", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300", icon: Clock3 },
  delivered: { label: "Recebido", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: CircleDashed },
  executed: { label: "Executado", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  failed: { label: "Falhou", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: XCircle },
  expired: { label: "Expirou", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: Clock3 },
  cancelled: { label: "Cancelado", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: XCircle },
};

function parsePayload(payload: string | null) {
  try { return payload ? JSON.parse(payload) as Record<string, unknown> : {}; } catch { return {}; }
}

export default function RemoteCommands() {
  const [deviceId, setDeviceId] = useState("");
  const [command, setCommand] = useState<(typeof commandOptions)[number]["value"]>("refresh_playlist");
  const [listIndex, setListIndex] = useState("1");
  const [dns, setDns] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("15");
  const utils = trpc.useUtils();
  const devices = trpc.devices.list.useQuery({ page: 1, pageSize: 100 });
  const commands = trpc.remoteCommands.list.useQuery(undefined, { refetchInterval: 10_000 });
  const send = trpc.remoteCommands.send.useMutation({
    onSuccess: async () => {
      await utils.remoteCommands.list.invalidate();
      toast.success("Comando colocado na fila. O painel aguardará a confirmação do aparelho.");
      setMessage(""); setDns("");
    },
    onError: error => toast.error(error.message),
  });
  const cancel = trpc.remoteCommands.cancel.useMutation({
    onSuccess: async () => { await utils.remoteCommands.list.invalidate(); toast.success("Comando cancelado."); },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.remoteCommands.delete.useMutation({
    onSuccess: async () => { await utils.remoteCommands.list.invalidate(); toast.success("Comando removido do histórico."); },
    onError: error => toast.error(error.message),
  });
  const clearHistory = trpc.remoteCommands.clearHistory.useMutation({
    onSuccess: async () => { await utils.remoteCommands.list.invalidate(); toast.success("Histórico de comandos limpo."); },
    onError: error => toast.error(error.message),
  });
  const rows = commands.data ?? [];
  const counters = useMemo(() => ({
    pending: rows.filter(row => row.status === "queued" || row.status === "delivered").length,
    executed: rows.filter(row => row.status === "executed").length,
    failed: rows.filter(row => row.status === "failed").length,
  }), [rows]);
  const completedRows = rows.filter(row => ["executed", "failed", "expired", "cancelled"].includes(row.status));
  const selectedOption = commandOptions.find(option => option.value === command)!;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!deviceId) return toast.error("Escolha o aparelho que receberá o comando.");
    const payload = {
      ...(command === "switch_playlist" ? { listIndex: Number(listIndex) } : {}),
      ...(command === "update_dns" ? { dns: dns.trim() } : {}),
      ...(command === "show_message" ? { message: message.trim() } : {}),
    };
    send.mutate({ deviceId: Number(deviceId), command, payload, expiresInMinutes: Number(expiresInMinutes) });
  }

  return <AdminLayout title="Comandos Remotos"><div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><MonitorCog size={17} /> Controle dos APKs</div><h1 className="text-2xl font-bold">Central de Comandos Remotos</h1><p className="mt-1 text-sm text-muted-foreground">Envie ações para o aparelho e acompanhe se ele recebeu, executou ou falhou.</p></div><Button variant="outline" className="gap-2 self-start sm:self-auto" disabled={commands.isFetching} onClick={() => commands.refetch()}><RefreshCw size={16} className={commands.isFetching ? "animate-spin" : ""} /> Atualizar status</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<Clock3 size={18} />} value={counters.pending} label="Aguardando aparelho" tone="text-blue-600" /><Metric icon={<CheckCircle2 size={18} />} value={counters.executed} label="Executados" tone="text-emerald-600" /><Metric icon={<XCircle size={18} />} value={counters.failed} label="Falharam" tone="text-rose-600" /></div>
    <Card className="border-primary/30"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Send size={17} /> Enviar comando</CardTitle><CardDescription>{selectedOption.hint} A ordem expira se o aparelho não responder no tempo escolhido.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="grid gap-1.5 text-sm font-medium xl:col-span-2">Aparelho<select value={deviceId} onChange={event => setDeviceId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione o cliente/aparelho</option>{devices.data?.data.map(device => <option key={device.id} value={device.id}>{device.nomeServer} · {device.mac} · {device.app || "Outro app"}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Ação<select value={command} onChange={event => setCommand(event.target.value as typeof command)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{commandOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">Expira em<select value={expiresInMinutes} onChange={event => setExpiresInMinutes(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="5">5 minutos</option><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">60 minutos</option></select></label>{command === "switch_playlist" && <label className="grid gap-1.5 text-sm font-medium"><span>Lista para aplicar</span><select value={listIndex} onChange={event => setListIndex(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="1">Lista 1</option><option value="2">Lista 2</option><option value="3">Lista 3</option></select></label>}{command === "update_dns" && <label className="grid gap-1.5 text-sm font-medium xl:col-span-2"><span>Nova DNS</span><Input value={dns} onChange={event => setDns(event.target.value)} placeholder="https://servidor.exemplo.com" /></label>}{command === "show_message" && <label className="grid gap-1.5 text-sm font-medium md:col-span-2 xl:col-span-4"><span>Mensagem que aparecerá no aparelho</span><Textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={500} placeholder="Ex.: Manutenção concluída. Abra o aplicativo novamente." /></label>}<div className="flex items-end xl:col-span-4"><Button type="submit" disabled={send.isPending} className="gap-2 text-black dark:text-white">{send.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar para o aparelho</Button></div></form></CardContent></Card>
    <Card><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><MonitorCog size={18} /> Histórico e confirmação</CardTitle><CardDescription className="mt-1">O APK consulta os comandos junto do heartbeat e confirma a execução. Não há confirmação falsa: a ordem fica pendente até o aparelho responder.</CardDescription></div><Button variant="outline" size="sm" className="w-fit gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={!completedRows.length || clearHistory.isPending} onClick={() => { if (window.confirm(`Excluir ${completedRows.length} comando(s) finalizado(s) do histórico?`)) clearHistory.mutate(); }}><Trash2 size={15} /> Limpar histórico</Button></div></CardHeader><CardContent className="space-y-3">{rows.map(row => { const meta = statusMeta[row.status] ?? statusMeta.queued; const Icon = meta.icon; const payload = parsePayload(row.payload); const canCancel = row.status === "queued" || row.status === "delivered"; const canDelete = ["executed", "failed", "expired", "cancelled"].includes(row.status); return <div key={row.id} className="flex flex-col gap-3 rounded-xl border p-4 xl:flex-row xl:items-center"><div className={`w-fit rounded-lg p-2 ${meta.className}`}><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{commandOptions.find(option => option.value === row.command)?.label ?? row.command}</p><Badge className={meta.className}>{meta.label}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{row.deviceName || "Aparelho removido"} · {row.deviceMac || "MAC indisponível"}{row.deviceApp ? ` · ${row.deviceApp}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{payload.listIndex ? `Lista ${payload.listIndex}` : ""}{payload.dns ? `DNS: ${payload.dns}` : ""}{payload.message ? `Mensagem: ${payload.message}` : ""}{row.resultMessage ? ` · ${row.resultMessage}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">Enviado em {new Date(row.createdAt).toLocaleString("pt-BR")} · Expira em {new Date(row.expiresAt).toLocaleString("pt-BR")}</p></div>{canCancel && <Button variant="outline" size="sm" className="w-fit border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={cancel.isPending} onClick={() => { if (window.confirm("Cancelar este comando antes que o aparelho o execute?")) cancel.mutate({ id: row.id }); }}>Cancelar</Button>}{canDelete && <Button variant="outline" size="icon" aria-label="Excluir comando do histórico" className="w-fit border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={remove.isPending} onClick={() => { if (window.confirm("Excluir este comando do histórico?")) remove.mutate({ id: row.id }); }}><Trash2 size={16} /></Button>}</div>; })}{!commands.isLoading && !rows.length && <div className="py-12 text-center text-sm text-muted-foreground"><ShieldAlert className="mx-auto mb-2 opacity-40" size={28} /> Nenhum comando remoto enviado ainda.</div>}</CardContent></Card>
  </div></AdminLayout>;
}

function Metric({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) { return <Card><CardContent className="p-4"><div className={tone}>{icon}</div><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
