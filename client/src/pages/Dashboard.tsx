import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, CalendarDays, Crown, Layers, Search, Shield,
  Star, Trophy, Users,
} from "lucide-react";
import { useState } from "react";

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <span>{title}</span>
            </p>
            <p className="text-2xl font-bold text-foreground">
              <span>{value}</span>
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrophyBadge({ position }: { position: number }) {
  if (position === 1) return <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>;
  if (position === 2) return <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>;
  if (position === 3) return <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>;
  return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"><span>{position}</span></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recentSearch, setRecentSearch] = useState("");

  const { data: stats, isLoading: statsLoading, error: statsError } = trpc.devices.stats.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();
  const { data: appsData, isLoading: appsLoading } = trpc.apps.list.useQuery();
  const { data: recentDevices, isLoading: recentLoading } = trpc.devices.recentList.useQuery({ search: recentSearch, limit: 5 });

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const liberadoApps = appsData ?? [];
  const topApps = [...liberadoApps].sort((a, b) => b.totalClientes - a.totalClientes).slice(0, 5);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground"><span>Dashboard</span></h1>
            {user && (
              <p className="text-sm text-muted-foreground">
                <span>{"ID: "}</span>
                <span>{user.id}</span>
                <span>{" · Bem-vindo, "}</span>
                <span>{user.name?.split(" ")[0]}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {planInfo?.planValidade && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50">
                <CalendarDays className="w-3 h-3" />
                <span>{"Validade: "}</span>
                <span>{formatDate(planInfo.planValidade)}</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 border-red-300 text-red-700 bg-red-50">
              <Shield className="w-3 h-3" />
              <span>{"LIMITE DE DEVICES: "}</span>
              <span>{planInfo?.limiteDevices ?? 999}</span>
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        {statsError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4" />
            <span>{"Erro ao carregar estatísticas."}</span>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard title="Total de Usuários" value={stats?.total ?? 0} icon={Users} color="bg-blue-500" />
              <StatCard title="Total de Revendas" value={stats?.revendas ?? 0} icon={Layers} color="bg-purple-500" />
              <StatCard title="Ultra Masters" value={stats?.ultraMasters ?? 0} icon={Crown} color="bg-orange-500" />
              <StatCard title="Total de Masters" value={stats?.masters ?? 0} icon={Star} color="bg-green-500" />
              <StatCard title="Receita Mensal" value={formatCurrency(stats?.receitaMensal ?? 0)} icon={Shield} color="bg-emerald-500" />
            </>
          )}
        </div>

        {/* Plan Info Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold"><span>{"Informações do meu plano"}</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold"><span>{"Nome"}</span></TableHead>
                  <TableHead className="text-xs font-semibold"><span>{"Informação"}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Meu Plano"}</span></TableCell>
                  <TableCell className="text-sm text-blue-600 font-medium"><span>{planInfo?.plano ?? "Revenda"}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Data do vencimento"}</span></TableCell>
                  <TableCell className="text-sm text-blue-600"><span>{formatDate(planInfo?.planValidade)}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-blue-600"><span>{planInfo?.limiteDevices ?? 999}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite Restante de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-blue-600"><span>{(planInfo?.limiteDevices ?? 999) - (stats?.total ?? 0)}</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Apps liberados */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold"><span>{"Apps liberados no meu plano"}</span></CardTitle>
            <Badge variant="secondary" className="text-xs">
              <span>{liberadoApps.length}</span>
              <span>{" apps"}</span>
            </Badge>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              <div className="flex gap-3 flex-wrap">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-32 rounded-lg" />)}</div>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {liberadoApps.map(app => (
                  <div key={app.id} className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors min-w-[100px]">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{app.nome.slice(0, 2)}</span>
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{app.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troféu Top Apps */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <h2 className="text-white font-bold text-lg"><span>{"Troféu Top Apps"}</span></h2>
            </div>
            <p className="text-purple-200 text-xs"><span>{"Mais usados pelos seus clientes"}</span></p>
          </div>
          <CardContent className="p-4">
            {appsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-2">
                {topApps.map((app, idx) => (
                  <div key={app.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <TrophyBadge position={idx + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"><span>{app.nome}</span></p>
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{app.totalClientes.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Usuários Cadastrados */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold"><span>{"Últimos Usuários Cadastrados"}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="default" className="h-8 px-3 text-xs">
                <Search className="w-3 h-3 mr-1" />
                <span>{"Buscar"}</span>
              </Button>
            </div>
            {recentLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs"><span>{"MAC"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"NOME DO SERVER"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"TIPO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"STATUS"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"DATA DE CADASTRO"}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentDevices ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        <span>{"Nenhum usuário cadastrado ainda."}</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (recentDevices ?? []).map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                        <TableCell className="text-xs"><span>{d.nomeServer}</span></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs"><span>{d.tipo}</span></Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${d.status === "Liberado" ? "bg-green-100 text-green-700 border-green-200" : d.status === "Expirado" ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}
                            variant="outline"
                          >
                            <span>{d.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs"><span>{formatDate(d.dataCadastro)}</span></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
