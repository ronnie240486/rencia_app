import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ClipboardList, RefreshCw, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function statusLabel(status: string) {
  if (status === "Liberado") return "Liberado";
  if (status === "Bloqueado") return "Bloqueado";
  if (status === "Expirado") return "Expirado";
  return status || "Sem status";
}

export default function ResellerClients() {
  const [search, setSearch] = useState("");
  const query = trpc.resellerReport.details.useQuery();
  const rows = query.data ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) => [
      row.resellerName,
      row.resellerEmail,
      row.clientName,
      row.serverName,
      row.app,
      row.mac,
      row.phone,
    ].some((value) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(normalizedSearch)));
  }, [normalizedSearch, rows]);
  const resellerCount = new Set(rows.map((row) => row.ownerId)).size;
  const appCount = new Set(rows.map((row) => row.app)).size;

  return (
    <AdminLayout title="Cadastros das Revendas">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary">
              <ClipboardList size={17} /> Visão exclusiva do proprietário
            </div>
            <h1 className="text-2xl font-bold">Cadastros das Revendas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Consulte em uma única aba quantos clientes cada revenda cadastrou e em qual aplicativo, nome e servidor estão vinculados.
            </p>
          </div>
          <Button className="gap-2 self-start text-black dark:text-white sm:self-auto" disabled={query.isFetching} onClick={() => query.refetch()}>
            <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Cadastros encontrados" value={rows.length} />
          <Metric label="Revendas com cadastro" value={resellerCount} />
          <Metric label="Aplicativos utilizados" value={appCount} />
        </div>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><UsersRound size={18} /> Lista detalhada</CardTitle>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar revenda, cliente, app ou servidor" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Revenda</th>
                    <th className="px-5 py-3">Nome do cliente</th>
                    <th className="px-5 py-3">Aplicativo</th>
                    <th className="px-5 py-3">Servidor</th>
                    <th className="px-5 py-3">MAC</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Validade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.ownerId}-${row.id}`} className="border-b last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium">{row.resellerName}</p>
                        <p className="text-xs text-muted-foreground">{row.resellerEmail}</p>
                      </td>
                      <td className="px-5 py-4 font-medium">{row.clientName || "Sem nome"}</td>
                      <td className="px-5 py-4"><Badge variant="secondary">{row.app}</Badge></td>
                      <td className="px-5 py-4">{row.serverName || "Não informado"}</td>
                      <td className="px-5 py-4 font-mono text-xs">{row.mac || "Sem MAC"}</td>
                      <td className="px-5 py-4"><Badge variant={row.status === "Liberado" ? "default" : row.status === "Bloqueado" ? "destructive" : "secondary"}>{statusLabel(row.status)}</Badge></td>
                      <td className="px-5 py-4">{formatDate(row.expiresAt)}</td>
                    </tr>
                  ))}
                  {!query.isLoading && filteredRows.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-14 text-center text-muted-foreground">{rows.length ? "Nenhum cadastro corresponde à busca." : "Nenhum cadastro de revenda encontrado."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-4"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>;
}
