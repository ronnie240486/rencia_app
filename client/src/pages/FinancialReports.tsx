import { BarChart3, CalendarDays, CircleDollarSign, ReceiptText, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const isoToday = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); };
const monthLabel = (month: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`));

export default function FinancialReports() {
  const [start, setStart] = useState(() => isoDaysAgo(29));
  const [end, setEnd] = useState(isoToday);
  const reportQuery = trpc.payments.report.useQuery({ start, end });
  const report = reportQuery.data;
  const maxValue = useMemo(() => Math.max(...(report?.byMonth.flatMap((item) => [item.billed, item.received]) ?? [1]), 1), [report]);
  const setPreset = (days: number) => { setStart(isoDaysAgo(days - 1)); setEnd(isoToday()); };

  return <AdminLayout title="Relatórios Financeiros"><div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><BarChart3 size={17} /> Gestão financeira</div><h1 className="text-2xl font-bold">Relatórios Financeiros</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe cobranças lançadas, recebimentos e pendências somente dos seus clientes.</p></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setPreset(7)}>7 dias</Button><Button size="sm" variant="outline" onClick={() => setPreset(30)}>30 dias</Button><Button size="sm" variant="outline" onClick={() => setPreset(90)}>90 dias</Button></div>
    </div>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]"><label className="grid gap-1.5 text-sm font-medium">Início<Input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="grid gap-1.5 text-sm font-medium">Fim<Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label><div className="flex items-end"><Button className="w-full gap-2 text-black dark:text-white" onClick={() => reportQuery.refetch()}><CalendarDays size={16} /> Atualizar</Button></div></CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<ReceiptText size={18} />} label="Cobrado no período" value={currency.format(report?.billed ?? 0)} tone="text-primary" />
      <Metric icon={<TrendingUp size={18} />} label="Recebido no período" value={currency.format(report?.received ?? 0)} tone="text-emerald-600" />
      <Metric icon={<WalletCards size={18} />} label="Pendente" value={currency.format(report?.pending ?? 0)} tone="text-amber-600" />
      <Metric icon={<TrendingDown size={18} />} label="Em atraso" value={currency.format(report?.overdue ?? 0)} tone="text-rose-600" />
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CircleDollarSign size={18} /> Evolução mensal</CardTitle><CardDescription>{report?.paymentCount ?? 0} cobrança(s) lançada(s) no período selecionado.</CardDescription></CardHeader><CardContent>{reportQuery.isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">Carregando relatório…</p> : !report?.byMonth.length ? <p className="py-12 text-center text-sm text-muted-foreground">Não há cobranças no período selecionado.</p> : <div className="space-y-4">{report.byMonth.map((month) => <div key={month.month} className="space-y-1.5"><div className="flex justify-between text-sm"><span className="capitalize">{monthLabel(month.month)}</span><span className="text-muted-foreground">Recebido {currency.format(month.received)} · Cobrado {currency.format(month.billed)}</span></div><div className="grid gap-1"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((month.billed / maxValue) * 100, 2)}%` }} /></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max((month.received / maxValue) * 100, 2)}%` }} /></div></div></div>)}</div>}</CardContent></Card>
  </div></AdminLayout>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return <Card><CardContent className="p-4"><div className={`mb-2 ${tone}`}>{icon}</div><p className={`text-xl font-bold ${tone}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>;
}
