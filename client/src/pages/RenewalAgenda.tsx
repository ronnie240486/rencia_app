import { CalendarClock, CheckSquare, MessageCircle, RefreshCw, Send, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const label: Record<string, string> = { expired: "Vencido", today: "Vence hoje", tomorrow: "Vence amanhã", upcoming: "Próximos dias" };
const tone: Record<string, string> = { expired: "destructive", today: "destructive", tomorrow: "default", upcoming: "secondary" };

export default function RenewalAgenda() {
  const [period, setPeriod] = useState("30");
  const [status, setStatus] = useState<"all" | "Liberado" | "Bloqueado" | "Expirado">("all");
  const [selected, setSelected] = useState<number[]>([]);
  const query = trpc.renewals.list.useQuery({ days: Number(period), status });
  const items = query.data ?? [];
  const selectedItems = useMemo(() => items.filter((item) => selected.includes(item.id) && item.waUrl), [items, selected]);
  const summary = items.reduce((acc, item) => ({ ...acc, [item.bucket]: (acc[item.bucket] ?? 0) + 1 }), {} as Record<string, number>);
  const toggle = (id: number) => setSelected((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
  const selectVisible = () => setSelected(items.filter((item) => item.waUrl).map((item) => item.id));
  const openMessages = () => {
    if (!selectedItems.length) return toast.error("Selecione clientes que tenham telefone cadastrado.");
    selectedItems.forEach((item, index) => window.setTimeout(() => window.open(item.waUrl!, "_blank", "noopener,noreferrer"), index * 450));
    toast.success(`${selectedItems.length} conversa(s) preparada(s) no WhatsApp.`);
  };
  return <AdminLayout title="Agenda de Renovação"><div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><CalendarClock size={17} /> Rotina de renovação</div><h1 className="text-2xl font-bold">Agenda de Renovação</h1><p className="mt-1 text-sm text-muted-foreground">Filtre os vencimentos e prepare avisos para vários clientes de uma vez.</p></div><div className="flex flex-wrap gap-2"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">7 dias</SelectItem><SelectItem value="15">15 dias</SelectItem><SelectItem value="30">30 dias</SelectItem><SelectItem value="60">60 dias</SelectItem></SelectContent></Select><Select value={status} onValueChange={(value: any) => setStatus(value)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="Liberado">Liberados</SelectItem><SelectItem value="Bloqueado">Bloqueados</SelectItem><SelectItem value="Expirado">Expirados</SelectItem></SelectContent></Select><Button variant="outline" size="icon" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /></Button></div></div>
    <div className="grid gap-3 sm:grid-cols-4"><Metric label="Vencidos" value={summary.expired ?? 0} /><Metric label="Vencem hoje" value={summary.today ?? 0} /><Metric label="Vencem amanhã" value={summary.tomorrow ?? 0} /><Metric label="Próximos dias" value={summary.upcoming ?? 0} /></div>
    <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Clientes com vencimento</CardTitle><CardDescription>Somente clientes com telefone podem ter a conversa de WhatsApp preparada.</CardDescription></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={selectVisible} className="gap-1.5"><CheckSquare size={15} /> Selecionar todos</Button><Button size="sm" onClick={openMessages} className="gap-1.5 text-black dark:text-white"><Send size={15} /> Preparar selecionados ({selectedItems.length})</Button></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="w-12 px-5 py-3"></th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3">Telefone</th><th className="px-5 py-3">Ação</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-5 py-4"><Checkbox checked={selected.includes(item.id)} disabled={!item.waUrl} onCheckedChange={() => toggle(item.id)} /></td><td className="px-5 py-4"><p className="font-medium">{item.nomeServer}</p><p className="text-xs text-muted-foreground">{item.status}</p></td><td className="px-5 py-4"><p>{new Date(item.dataExpiracao).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p><p className="text-xs text-muted-foreground">{item.days < 0 ? `${Math.abs(item.days)} dia(s) atrasado` : item.days === 0 ? "Hoje" : `Em ${item.days} dia(s)`}</p></td><td className="px-5 py-4"><Badge variant={tone[item.bucket] as any}>{label[item.bucket]}</Badge></td><td className="px-5 py-4">{item.telefone || <span className="text-muted-foreground">Não cadastrado</span>}</td><td className="px-5 py-4">{item.waUrl ? <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(item.waUrl!, "_blank", "noopener,noreferrer")}><MessageCircle size={14} /> WhatsApp</Button> : "—"}</td></tr>)}{!query.isLoading && !items.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-muted-foreground">Nenhum vencimento encontrado para o filtro atual.</td></tr>}</tbody></table></div></CardContent></Card>
  </div></AdminLayout>;
}
function Metric({ label, value }: { label: string; value: number }) { return <Card><CardContent className="p-4"><UsersRound size={18} className="mb-2 text-primary" /><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>; }
