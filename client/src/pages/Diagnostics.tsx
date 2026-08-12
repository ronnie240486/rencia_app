import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatDateOnlyPtBr } from "@shared/dateOnly";
import { Activity, CircleAlert, Clock3, ListChecks, Radio, RefreshCw, Search, Tv, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

const statusConfig = {
  online: { label: "Online", icon: Wifi, className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  offline: { label: "Offline", icon: WifiOff, className: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  never: { label: "Sem acesso", icon: CircleAlert, className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
} as const;
type ConnectionStatus = keyof typeof statusConfig;

function lastSeenLabel(value: Date | string | null) {
  if (!value) return "Nunca conectado";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `Há ${hours} h` : `Há ${Math.floor(hours / 24)} d`;
}

export default function Diagnostics() {
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "never">("all");
  const [search, setSearch] = useState("");
  const query = trpc.superPanel.diagnostics.useQuery({ recentMinutes: 30 }, { refetchInterval: 30_000 });
  const items = useMemo(() => (query.data ?? []).filter(item => {
    const matchesFilter = filter === "all" || item.connection === filter;
    const text = `${item.nomeServer} ${item.mac} ${item.app ?? ""}`.toLowerCase();
    return matchesFilter && text.includes(search.toLowerCase());
  }), [filter, query.data, search]);
  const totals = (query.data ?? []).reduce((acc, item) => {
    const connection = item.connection as ConnectionStatus;
    acc[connection] += 1;
    return acc;
  }, { online: 0, offline: 0, never: 0 });

  return <AdminLayout title="Diagnóstico de Conexão">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end"><div><div className="text-primary text-xs font-bold uppercase tracking-[.18em] flex gap-2 items-center mb-1"><Activity size={17} /> Super Painel</div><h1 className="text-2xl font-bold">Diagnóstico de Conexão</h1><p className="text-sm text-muted-foreground mt-1">Status real de acesso, conteúdo assistido e listas vinculadas por dispositivo.</p></div><Button variant="outline" onClick={() => query.refetch()} className="gap-2 self-start sm:self-auto"><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button></div>

      <div className="grid grid-cols-3 gap-3"><Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-600">{totals.online}</p><p className="text-xs text-muted-foreground">Online agora</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-2xl font-bold text-rose-600">{totals.offline}</p><p className="text-xs text-muted-foreground">Offline</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-2xl font-bold text-slate-500">{totals.never}</p><p className="text-xs text-muted-foreground">Sem acesso</p></CardContent></Card></div>

      <Card><CardHeader className="gap-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><CardTitle className="text-base">Dispositivos monitorados</CardTitle><CardDescription>Online significa atividade nos últimos 30 minutos.</CardDescription></div><div className="flex gap-2 flex-wrap">{(["all", "online", "offline", "never"] as const).map(item => <Button key={item} size="sm" variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)}>{item === "all" ? "Todos" : statusConfig[item].label}</Button>)}</div></div><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, MAC ou aplicativo" /></div></CardHeader><CardContent><div className="space-y-3">{items.map(item => { const config = statusConfig[item.connection as ConnectionStatus]; const Icon = config.icon; return <div key={item.id} className="border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-4"><div className="flex items-center gap-3 min-w-0 flex-1"><div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Tv size={19} /></div><div className="min-w-0"><p className="font-medium truncate">{item.nomeServer}</p><p className="font-mono text-xs text-muted-foreground">{item.mac}</p></div></div><Badge className={`${config.className} w-fit gap-1`} variant="secondary"><Icon size={13} /> {config.label}</Badge><div className="text-sm min-w-36"><p className="text-xs text-muted-foreground flex gap-1 items-center"><Clock3 size={13} /> Último acesso</p><p>{lastSeenLabel(item.lastSeen)}</p></div><div className="text-sm min-w-36"><p className="text-xs text-muted-foreground flex gap-1 items-center"><ListChecks size={13} /> Listas ativas</p><p>{item.listCount}</p></div><div className="text-sm min-w-44"><p className="text-xs text-muted-foreground flex gap-1 items-center"><Radio size={13} /> Assistindo</p><p className="truncate">{item.currentContent || "Sem informação"}</p></div><div className="text-sm min-w-28"><p className="text-xs text-muted-foreground">Expira em</p><p>{formatDateOnlyPtBr(item.dataExpiracao)}</p></div></div>})}{!query.isLoading && items.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">Nenhum dispositivo encontrado com este filtro.</p>}</div></CardContent></Card>
    </div>
  </AdminLayout>;
}
