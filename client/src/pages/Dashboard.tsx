import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, CalendarDays, Crown, Layers, Search, Shield,
  Star, Users, Wifi, WifiOff, RefreshCw, Activity,
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

export default function Dashboard() {
  const { user } = useAuth();
  const [recentSearch, setRecentSearch] = useState("");
  const [connectedFilter, setConnectedFilter] = useState(30);

  const { data: stats, isLoading: statsLoading, error: statsError } = trpc.devices.stats.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();
  const { data: recentDevices, isLoading: recentLoading } = trpc.devices.recentList.useQuery({ search: recentSearch, limit: 5 });
  const { data: connectedDevices, isLoading: connectedLoading, refetch: refetchConnected } = trpc.connected.list.useQuery({ minutesAgo: connectedFilter });

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
  };

  const formatLastSeen = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR });
    } catch { return "—"; }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
            <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-700 bg-green-50">
              <Shield className="w-3 h-3" />
              <span>{"DEVICES: "}</span>
              <span>{planInfo?.limiteDevices === 999999 ? "Ilimitado" : (planInfo?.limiteDevices ?? 999)}</span>
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

        {/* ─── Dispositivos Conectados (OuroPro Online) ─── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-sm font-semibold">
                  <span>{"Dispositivos Conectados no OuroPro"}</span>
                </CardTitle>
                {!connectedLoading && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200" variant="outline">
                    <Activity className="w-3 h-3 mr-1" />
                    <span>{connectedDevices?.length ?? 0}</span>
                    <span>{" online"}</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{"Últimos:"}</span>
                {[15, 30, 60, 120].map(m => (
                  <Button
                    key={m}
                    size="sm"
                    variant={connectedFilter === m ? "default" : "outline"}
                    className="h-6 px-2 text-xs"
                    onClick={() => setConnectedFilter(m)}
                  >
                    <span>{m < 60 ? `${m}min` : `${m / 60}h`}</span>
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => refetchConnected()}
                  title="Atualizar"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {connectedLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (connectedDevices ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <WifiOff className="w-8 h-8 opacity-30" />
                <p className="text-sm">
                  <span>{"Nenhum dispositivo conectado nos últimos "}</span>
                  <span>{connectedFilter < 60 ? `${connectedFilter} minutos` : `${connectedFilter / 60} hora(s)`}</span>
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs"><span>{"STATUS"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"MAC"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"NOME DO SERVER"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"TIPO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"ASSISTINDO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"ÚLTIMA CONEXÃO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"EXPIRA EM"}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(connectedDevices ?? []).map(d => {
                    const isRecent = d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 5 * 60 * 1000;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isRecent ? (
                              <Wifi className="w-3 h-3 text-green-500" />
                            ) : (
                              <Wifi className="w-3 h-3 text-amber-400" />
                            )}
                            <span className={`text-xs font-medium ${isRecent ? "text-green-600" : "text-amber-600"}`}>
                              {isRecent ? "Online" : "Recente"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                        <TableCell className="text-xs"><span>{d.nomeServer}</span></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs"><span>{d.tipo}</span></Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px]">
                          {d.currentContent ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium truncate" title={d.currentContent}>
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                              <span className="truncate">{d.currentContent}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span>{formatLastSeen(d.lastSeen)}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={d.dataExpiracao && new Date(d.dataExpiracao) < new Date() ? "text-red-500" : "text-foreground"}>
                            {formatDate(d.dataExpiracao)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                  <TableCell className="text-sm text-primary font-medium"><span>{planInfo?.plano ?? "Revenda"}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Data do vencimento"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{formatDate(planInfo?.planValidade)}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{planInfo?.limiteDevices ?? 999}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite Restante de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{(planInfo?.limiteDevices ?? 999) - (stats?.total ?? 0)}</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
