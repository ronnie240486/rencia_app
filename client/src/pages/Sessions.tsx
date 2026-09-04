import { Activity, AlertTriangle, Ban, CheckCircle2, MonitorSmartphone, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const relativeTime = (value: Date | null) => {
  if (!value) return "Sem conexão registrada";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 1 ? "Agora" : minutes === 1 ? "Há 1 minuto" : `Há ${minutes} minutos`;
};

export default function Sessions() {
  const query = trpc.sessions.list.useQuery({ minutesAgo: 30 }, { refetchInterval: 30_000 });
  const utils = trpc.useUtils();
  const setStatus = trpc.sessions.setStatus.useMutation({ onSuccess: async () => { await utils.sessions.list.invalidate(); toast.success("Status do dispositivo atualizado."); } });
  const sessions = query.data ?? [];
  const suspicious = sessions.filter((session) => session.risk === "suspicious");
  const active = sessions.filter((session) => session.active);
  const activeApkSessions = sessions.reduce((total, session) => total + session.activeSessions, 0);
  return <AdminLayout title="Controle de Sessões"><div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><ShieldCheck size={17} /> Segurança de acesso</div><h1 className="text-2xl font-bold">Controle de Sessões</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe os últimos acessos por MAC. O aviso de risco aparece quando o mesmo MAC está ativo em mais de um cadastro.</p></div><Button onClick={() => query.refetch()} disabled={query.isFetching} className="gap-2 text-black dark:text-white"><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<Wifi size={18} />} label="Dispositivos online" value={active.length} tone="text-emerald-600" /><Metric icon={<MonitorSmartphone size={18} />} label="Sessões dos APKs" value={activeApkSessions} tone="text-primary" /><Metric icon={<AlertTriangle size={18} />} label="MACs suspeitos" value={suspicious.length} tone="text-amber-600" /><Metric icon={<ShieldCheck size={18} />} label="Dispositivos" value={sessions.length} tone="text-primary" /></div>
    {suspicious.length > 0 && <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"><CardContent className="flex gap-3 p-4 text-sm text-amber-900 dark:text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p><strong>Atenção:</strong> os registros marcados como suspeitos possuem o mesmo MAC ativo em mais de um cadastro. Verifique antes de bloquear para evitar interromper um acesso legítimo.</p></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity size={18} /> Sessões recentes</CardTitle><CardDescription>A atualização é automática a cada 30 segundos enquanto esta tela estiver aberta.</CardDescription></CardHeader><CardContent><div className="space-y-3">{sessions.map((session) => <div key={session.id} className="flex flex-col gap-4 rounded-xl border p-4 xl:flex-row xl:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${session.active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{session.active ? <Wifi size={18} /> : <WifiOff size={18} />}</div><div className="min-w-0"><p className="truncate font-medium">{session.nomeServer}</p><p className="font-mono text-xs text-muted-foreground">{session.mac}</p><p className="mt-1 text-xs text-muted-foreground">{session.app || "Aplicativo não informado"} · {relativeTime(session.lastSeen)}</p><p className="mt-1 text-xs text-muted-foreground">Sessões dos APKs: {session.activeSessions} de {session.maxConcurrentConnections} {session.maxConcurrentConnections === 1 ? "permitida" : "permitidas"}</p>{session.currentContent && <p className="mt-1 truncate text-xs text-muted-foreground">Assistindo: {session.currentContent}</p>}</div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={session.status === "Bloqueado" ? "destructive" : "secondary"}>{session.status}</Badge>{session.risk === "suspicious" && <Badge className="bg-amber-500 text-black hover:bg-amber-500">MAC repetido ({session.repeatedMacCount})</Badge>}<Button size="sm" variant={session.status === "Bloqueado" ? "outline" : "destructive"} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: session.id, status: session.status === "Bloqueado" ? "Liberado" : "Bloqueado" })} className="gap-1.5">{session.status === "Bloqueado" ? <CheckCircle2 size={14} /> : <Ban size={14} />}{session.status === "Bloqueado" ? "Liberar" : "Bloquear"}</Button></div></div>)}{!query.isLoading && sessions.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhum dispositivo cadastrado para esta conta.</p>}</div></CardContent></Card>
  </div></AdminLayout>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return <Card><CardContent className="p-4"><div className={`mb-2 ${tone}`}>{icon}</div><p className={`text-2xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>;
}
