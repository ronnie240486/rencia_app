import { Activity, ArrowRight, CheckCircle2, CircleAlert, HeartPulse, ListChecks, RefreshCw, Server, Smartphone, TriangleAlert, UsersRound } from "lucide-react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type HealthStatus = "healthy" | "attention" | "critical" | "unknown";

const healthStyle: Record<HealthStatus, { label: string; dot: string; badge: string }> = {
  healthy: { label: "Normal", dot: "bg-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" },
  attention: { label: "Atenção", dot: "bg-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300" },
  critical: { label: "Falha confirmada", dot: "bg-rose-500", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" },
  unknown: { label: "Sem leitura", dot: "bg-slate-400", badge: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300" },
};

function HealthBadge({ status }: { status: HealthStatus }) {
  const style = healthStyle[status];
  return <Badge variant="outline" className={`gap-1.5 border text-[11px] ${style.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{style.label}</Badge>;
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tone}`}><Icon size={18} /></div><div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

export default function OperationHealth() {
  const health = trpc.operationHealth.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const data = health.data;
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <AdminLayout title="Saúde da Operação">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><HeartPulse size={18} /> Visão operacional</div><h1 className="text-2xl font-bold tracking-tight">Mapa de saúde da operação</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Leitura consolidada de aplicativos, servidores, listas e clientes. Esta central recomenda caminhos seguros, mas não modifica nada automaticamente.</p></div>
            <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Atualizado às {generatedAt}</span><Button variant="outline" onClick={() => health.refetch()} disabled={health.isFetching} className="gap-2"><RefreshCw size={16} className={health.isFetching ? "animate-spin" : ""} /> Atualizar</Button></div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Grupos normais" value={data?.summary.healthy ?? 0} icon={CheckCircle2} tone="bg-emerald-500/10 text-emerald-600" /><SummaryCard label="Grupos em atenção" value={data?.summary.attention ?? 0} icon={CircleAlert} tone="bg-amber-500/10 text-amber-600" /><SummaryCard label="Falhas confirmadas" value={data?.summary.critical ?? 0} icon={TriangleAlert} tone="bg-rose-500/10 text-rose-600" /><SummaryCard label="Clientes no escopo" value={data?.summary.devices ?? 0} icon={UsersRound} tone="bg-primary/10 text-primary" /></div>

        <div className="grid gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-3"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ListChecks size={17} /> Assistente operacional</CardTitle><CardDescription>Prioridades calculadas somente a partir de situação já registrada no painel.</CardDescription></CardHeader><CardContent className="space-y-3">{data?.recommendations.map((recommendation) => <div key={recommendation.title} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{recommendation.title}</p><Badge variant={recommendation.priority === "Alta" ? "destructive" : recommendation.priority === "Média" ? "secondary" : "outline"}>{recommendation.priority}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{recommendation.detail}</p></div><Link href={recommendation.href}><Button size="sm" variant="outline" className="shrink-0 gap-1.5">{recommendation.actionLabel}<ArrowRight size={14} /></Button></Link></div>) ?? <div className="py-8 text-center text-sm text-muted-foreground">Carregando recomendações…</div>}</CardContent></Card>
          <Card className="xl:col-span-2"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Activity size={17} /> Indicadores atuais</CardTitle><CardDescription>Situações que precisam de atenção no seu escopo.</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-3">{[{ label: "Listas com falha", value: data?.counts.listErrors ?? 0, href: "/monitor-listas" }, { label: "Sem conexão recente", value: data?.counts.offline ?? 0, href: "/diagnostico" }, { label: "Vencem em 7 dias", value: data?.counts.expiring ?? 0, href: "/chatbot" }, { label: "Sem telefone", value: data?.counts.missingPhone ?? 0, href: "/users" }].map((item) => <Link key={item.label} href={item.href}><div className="rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/50"><p className="text-xl font-bold tabular-nums">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">{item.label}</p></div></Link>)}</CardContent></Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Smartphone size={17} /> Aplicativos</CardTitle><CardDescription>Saúde agrupada pelos clientes vinculados a cada aplicativo.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{data?.apps.length ? data.apps.map((item) => <Link key={item.label} href={item.href}><div className="flex h-full items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><HealthBadge status={item.status} /></div></Link>) : <p className="text-sm text-muted-foreground">Nenhum aplicativo com cliente no escopo.</p>}</CardContent></Card>
          <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Server size={17} /> Servidores e listas</CardTitle><CardDescription>Endereços exibidos sem caminhos privados, usuários ou senhas.</CardDescription></CardHeader><CardContent className="space-y-2">{data?.servers.length ? data.servers.map((item) => <Link key={item.label} href={item.href}><div className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"><div className="min-w-0"><p className="truncate font-mono text-xs font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div><HealthBadge status={item.status} /></div></Link>) : <p className="text-sm text-muted-foreground">Nenhum servidor identificado.</p>}{data?.lists.length ? <div className="border-t pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Listas que pedem atenção</p>{data.lists.slice(0, 4).map((item) => <Link key={item.label} href={item.href}><div className="mb-1 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"><span className="truncate text-sm">{item.label}</span><HealthBadge status={item.status} /></div></Link>)}</div> : null}</CardContent></Card>
        </div>
      </div>
    </AdminLayout>
  );
}
