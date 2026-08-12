import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, CheckCircle2, CircleAlert, Clock3, ExternalLink, ListChecks, Loader2, Radio, RefreshCw, ServerCrash } from "lucide-react";
import { toast } from "sonner";

function checkedLabel(value: Date | string | null | undefined) {
  if (!value) return "Ainda não verificada";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  return `Há ${Math.floor(minutes / 60)} h`;
}

export default function ListMonitor() {
  const utils = trpc.useUtils();
  const query = trpc.listMonitor.list.useQuery();
  const check = trpc.listMonitor.check.useMutation({ onSuccess: async () => { await Promise.all([utils.listMonitor.list.invalidate(), utils.superPanel.overview.invalidate()]); } });
  const checkAll = trpc.listMonitor.checkAll.useMutation({ onSuccess: async (result) => { await Promise.all([utils.listMonitor.list.invalidate(), utils.superPanel.overview.invalidate()]); toast.success(`${result.checked} lista(s) verificadas: ${result.success} disponível(is) e ${result.errors} com erro.`); } });
  const lists = query.data ?? [];
  const summary = lists.reduce((acc, item) => { const status = (item.lastCheck?.status ?? "pending") as "success" | "error" | "pending"; acc[status] += 1; return acc; }, { success: 0, error: 0, pending: 0 });

  return <AdminLayout title="Monitor de Listas"><div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4"><div><div className="text-primary text-xs font-bold uppercase tracking-[.18em] flex items-center gap-2 mb-1"><Activity size={17} /> Super Painel</div><h1 className="text-2xl font-bold">Monitor de Listas</h1><p className="text-sm text-muted-foreground mt-1">Teste manualmente as URLs cadastradas e identifique indisponibilidades antes do cliente reclamar.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => query.refetch()} className="gap-2"><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button><Button onClick={() => checkAll.mutate()} disabled={checkAll.isPending || lists.length === 0} className="gap-2 text-black dark:text-white">{checkAll.isPending ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />} Verificar todas</Button></div></div>
    <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"><CardContent className="p-4 text-sm text-blue-800 dark:text-blue-200">A verificação usa somente URLs públicas HTTP/HTTPS. Endereços locais e internos são bloqueados por segurança. O monitor registra o resultado e atualiza a Central de Controle.</CardContent></Card>
    <div className="grid grid-cols-3 gap-3"><Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-600">{summary.success}</p><p className="text-xs text-muted-foreground">Disponíveis</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-2xl font-bold text-rose-600">{summary.error}</p><p className="text-xs text-muted-foreground">Com erro</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-2xl font-bold text-slate-500">{summary.pending}</p><p className="text-xs text-muted-foreground">Não verificadas</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio size={17} /> Listas cadastradas</CardTitle><CardDescription>O botão individual verifica apenas a lista escolhida.</CardDescription></CardHeader><CardContent><div className="space-y-3">{lists.map(item => { const result = item.lastCheck; const ok = result?.status === "success"; const failed = result?.status === "error"; return <div key={`${item.deviceId}:${item.deviceUrlId ?? "main"}`} className="rounded-xl border p-4 flex flex-col xl:flex-row gap-4 xl:items-center"><div className="flex-1 min-w-0"><div className="flex gap-2 items-center"><p className="font-medium truncate">{item.listName}</p>{ok && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}{failed && <ServerCrash size={16} className="text-rose-600 shrink-0" />}</div><p className="text-sm text-muted-foreground truncate">{item.deviceName}</p><p className="text-xs text-muted-foreground truncate mt-1">{item.url}</p></div><div className="min-w-36"><p className="text-xs text-muted-foreground flex gap-1 items-center"><Clock3 size={13} /> Última verificação</p><p className="text-sm">{checkedLabel(result?.checkedAt)}</p></div><div className="min-w-44"><p className="text-xs text-muted-foreground">Resultado</p>{result ? <Badge variant="secondary" className={ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}>{result.message}{result.responseTimeMs ? ` · ${result.responseTimeMs}ms` : ""}</Badge> : <Badge variant="secondary">Pendente</Badge>}</div><div className="flex gap-2"><Button size="sm" onClick={() => check.mutate({ deviceId: item.deviceId, deviceUrlId: item.deviceUrlId })} disabled={check.isPending} className="gap-1.5 text-black dark:text-white">{check.isPending ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} Verificar</Button><a href={item.url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><ExternalLink size={14} /></Button></a></div></div>})}{!query.isLoading && lists.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground"><CircleAlert className="mx-auto mb-2 opacity-40" size={28} /> Nenhuma lista com URL disponível foi encontrada.</div>}</div></CardContent></Card>
  </div></AdminLayout>;
}
