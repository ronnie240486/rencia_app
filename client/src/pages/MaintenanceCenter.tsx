import { AlertTriangle, ArrowRight, CheckCircle2, CircleOff, ListX, RefreshCw, ShieldAlert, Wrench } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const priorityLabel: Record<string, string> = { critical: "Crítico", high: "Atenção", normal: "Informativo" };
const priorityClass: Record<string, string> = { critical: "bg-destructive text-destructive-foreground", high: "bg-amber-500 text-black", normal: "bg-secondary text-secondary-foreground" };

export default function MaintenanceCenter() {
  const query = trpc.maintenance.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const data = query.data ?? { listErrors: 0, offline: 0, blocked: 0, actions: [] };
  return <AdminLayout title="Central de Manutenção"><div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><Wrench size={17} /> Operação preventiva</div><h1 className="text-2xl font-bold">Central de Manutenção</h1><p className="mt-1 text-sm text-muted-foreground">Priorize falhas de listas, dispositivos sem conexão e acessos que precisam de revisão.</p></div><Button className="gap-2 text-black dark:text-white" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<ListX size={18} />} value={data.listErrors} label="Listas com falha" className="text-destructive" /><Metric icon={<CircleOff size={18} />} value={data.offline} label="Offline há 24h" className="text-amber-600" /><Metric icon={<ShieldAlert size={18} />} value={data.blocked} label="Bloqueados / expirados" className="text-primary" /></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={18} /> Ações prioritárias</CardTitle><CardDescription>As falhas mais urgentes aparecem primeiro. A lista é atualizada a cada minuto nesta tela.</CardDescription></CardHeader><CardContent><div className="space-y-3">{data.actions.map((action) => <div key={action.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><Badge className={`w-fit ${priorityClass[action.priority]}`}>{priorityLabel[action.priority]}</Badge><div className="min-w-0 flex-1"><p className="font-medium">{action.type}</p><p className="mt-1 text-sm text-muted-foreground">{action.message}</p></div>{action.type === "Lista indisponível" ? <Link href="/monitor-listas"><Button variant="outline" size="sm" className="gap-1.5">Monitor de Listas <ArrowRight size={14} /></Button></Link> : <Link href="/sessoes"><Button variant="outline" size="sm" className="gap-1.5">Ver sessões <ArrowRight size={14} /></Button></Link>}</div>)}{!query.isLoading && data.actions.length === 0 && <div className="flex flex-col items-center gap-2 py-12 text-center"><CheckCircle2 className="text-emerald-600" size={28} /><p className="font-medium">Nenhuma ação urgente no momento</p><p className="text-sm text-muted-foreground">As listas verificadas e os dispositivos estão sem alertas prioritários.</p></div>}</div></CardContent></Card>
  </div></AdminLayout>;
}
function Metric({ icon, value, label, className }: { icon: React.ReactNode; value: number; label: string; className: string }) { return <Card><CardContent className="p-4"><div className={`mb-2 ${className}`}>{icon}</div><p className={`text-2xl font-bold ${className}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
