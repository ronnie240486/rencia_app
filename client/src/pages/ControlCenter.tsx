import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDateOnlyPtBr } from "@shared/dateOnly";
import { Activity, AlertTriangle, BellRing, ClipboardList, History, PhoneOff, Radio, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import { Link } from "wouter";

function relativeTime(value: Date | string) {
  const time = new Date(value).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}

export default function ControlCenter() {
  const overview = trpc.superPanel.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const data = overview.data;

  const cards = [
    { label: "Vencendo em 7 dias", value: data?.counts.expiring ?? 0, icon: BellRing, tone: "text-amber-600 bg-amber-500/10", href: "/chatbot" },
    { label: "Sem conexão", value: data?.counts.offline ?? 0, icon: WifiOff, tone: "text-rose-600 bg-rose-500/10", href: "/diagnostico" },
    { label: "Sem telefone", value: data?.counts.missingPhone ?? 0, icon: PhoneOff, tone: "text-blue-600 bg-blue-500/10", href: "/users" },
    { label: "Erros de listas", value: data?.counts.listErrors ?? 0, icon: Radio, tone: "text-violet-600 bg-violet-500/10", href: "/monitor-listas" },
  ];

  return (
    <AdminLayout title="Central de Controle">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1"><ShieldAlert size={19} /><span className="text-xs font-bold uppercase tracking-[0.18em]">Super Painel</span></div>
            <h1 className="text-2xl font-bold tracking-tight">Central de Alertas</h1>
            <p className="text-sm text-muted-foreground mt-1">Acompanhe riscos, conexões e alterações importantes em um só lugar.</p>
          </div>
          <Button variant="outline" onClick={() => overview.refetch()} disabled={overview.isFetching} className="gap-2 self-start sm:self-auto">
            <RefreshCw size={16} className={overview.isFetching ? "animate-spin" : ""} /> Atualizar agora
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ label, value, icon: Icon, tone, href }) => (
            <Link key={label} href={href}>
              <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p></div>
                    <div className={`p-2 rounded-lg ${tone}`}><Icon size={18} /></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500" /> Situações que pedem atenção</CardTitle><CardDescription>Os alertas são atualizados automaticamente a cada minuto.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {(data?.expiring.length ?? 0) > 0 && (
                <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-200">Vencimentos próximos</p>
                  <div className="mt-2 space-y-2">{data?.expiring.map(item => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.nomeServer}</span><Badge variant="secondary">{formatDateOnlyPtBr(item.dataExpiracao)}</Badge></div>)}</div>
                </section>
              )}
              {(data?.offline.length ?? 0) > 0 && (
                <section className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/20">
                  <p className="font-medium text-sm text-rose-800 dark:text-rose-200">Dispositivos sem conexão recente</p>
                  <div className="mt-2 space-y-2">{data?.offline.map(item => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="truncate">{item.nomeServer}</span><span className="text-muted-foreground shrink-0">{item.lastSeen ? relativeTime(item.lastSeen) : "sem acesso"}</span></div>)}</div>
                </section>
              )}
              {(data?.missingPhone.length ?? 0) > 0 && <section className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20"><p className="font-medium text-sm text-blue-800 dark:text-blue-200">Clientes sem telefone para avisos</p><p className="mt-1 text-sm text-muted-foreground">{data?.missingPhone.slice(0, 3).map(item => item.nomeServer).join(", ")}{(data?.missingPhone.length ?? 0) > 3 ? "…" : ""}</p></section>}
              {!overview.isLoading && !data?.counts.expiring && !data?.counts.offline && !data?.counts.missingPhone && !data?.counts.listErrors && <div className="text-center py-10 text-sm text-muted-foreground"><Activity className="mx-auto mb-2 opacity-50" size={24} /> Nenhum alerta crítico no momento.</div>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History size={17} /> Histórico de Ações</CardTitle><CardDescription>Últimas alterações registradas no painel.</CardDescription></CardHeader>
            <CardContent>
              {(data?.recentActions.length ?? 0) === 0 ? <div className="text-sm text-muted-foreground py-6 text-center"><ClipboardList className="mx-auto mb-2 opacity-50" size={22} /> As próximas alterações serão registradas aqui.</div> : <div className="space-y-4">{data?.recentActions.map(action => <div key={action.id} className="relative pl-4 border-l border-border"><p className="text-sm font-medium leading-snug">{action.summary}</p><p className="text-xs text-muted-foreground mt-1">{relativeTime(action.createdAt)} · {action.action}</p></div>)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
