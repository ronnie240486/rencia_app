import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { MANAGED_APP_CATALOG } from "@shared/appCatalog";
import { useMemo } from "react";

interface AppRanking {
  name: string;
  logo: string;
  color: string;
  users: number;
  position: number;
  percentage: number;
}

export default function RankingApps() {
  // Buscar estatísticas de apps
  const { data: appStats } = trpc.ranking.appStats.useQuery();
  
  const appCounts = useMemo(() => {
    return {
      'Ouro Pro': appStats?.ouropro || 0,
      'Maximus': appStats?.maximus || 0,
      'Fusion': appStats?.ultra || 0,
      'Prestige': appStats?.prestige || 0,
      'Optimus': appStats?.optimus || 0,
      'Império Play': appStats?.imperio || 0,
      'Infinitus': appStats?.infinitus || 0,
      'Supremus': appStats?.supremus || 0,
      'Evolux': appStats?.evolux || 0,
      'Nexus': appStats?.nexus || 0,
    };
  }, [appStats]);

  const totalUsers = (appStats?.total) || 0;

  // Criar ranking dos aplicativos disponíveis no painel
  const ranking: AppRanking[] = useMemo(() => {
    const apps = [
      {
        name: "Ouro Pro",
        logo: MANAGED_APP_CATALOG.ouropro.defaultLogoUrl,
        color: "yellow",
        users: appCounts['Ouro Pro'] || 0,
      },
      {
        name: "Maximus",
        logo: MANAGED_APP_CATALOG.maximus.defaultLogoUrl,
        color: "purple",
        users: appCounts['Maximus'] || 0,
      },
      {
        name: "Fusion",
        logo: MANAGED_APP_CATALOG.fusion.defaultLogoUrl,
        color: "cyan",
        users: appCounts['Fusion'] || 0,
      },
      { name: "Prestige", logo: MANAGED_APP_CATALOG.prestige.defaultLogoUrl, color: "purple", users: appCounts['Prestige'] || 0 },
      { name: "Optimus", logo: MANAGED_APP_CATALOG.optimus.defaultLogoUrl, color: "cyan", users: appCounts['Optimus'] || 0 },
      { name: "Império Play", logo: MANAGED_APP_CATALOG.imperio.defaultLogoUrl, color: "yellow", users: appCounts['Império Play'] || 0 },
      { name: "Infinitus", logo: MANAGED_APP_CATALOG.infinitus.defaultLogoUrl, color: "purple", users: appCounts['Infinitus'] || 0 },
      { name: "Supremus", logo: MANAGED_APP_CATALOG.supremus.defaultLogoUrl, color: "yellow", users: appCounts['Supremus'] || 0 },
      { name: "Evolux", logo: MANAGED_APP_CATALOG.evolux.defaultLogoUrl, color: "cyan", users: appCounts['Evolux'] || 0 },
      { name: "Nexus", logo: MANAGED_APP_CATALOG.nexus.defaultLogoUrl, color: "purple", users: appCounts['Nexus'] || 0 },
    ];

    return apps
      .sort((a, b) => b.users - a.users)
      .map((app, idx) => ({
        ...app,
        position: idx + 1,
        percentage: totalUsers > 0 ? Math.round((app.users / totalUsers) * 100) : 0,
      }));
  }, [appCounts, totalUsers]);

  const colorClasses = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 via-yellow-50 to-yellow-100/50 dark:from-yellow-950/40 dark:via-yellow-900/20 dark:to-yellow-800/30",
    purple: "border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:via-purple-900/20 dark:to-purple-800/30",
    cyan: "border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 via-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:via-cyan-900/20 dark:to-cyan-800/30",
  };

  const positionColors = {
    1: "from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-400/50",
    2: "from-gray-300 to-gray-500 shadow-lg shadow-gray-400/50",
    3: "from-orange-300 to-orange-600 shadow-lg shadow-orange-400/50",
  };

  const badgeColors = {
    yellow: "bg-yellow-500 text-yellow-900 hover:bg-yellow-600",
    purple: "bg-purple-500 text-white hover:bg-purple-600",
    cyan: "bg-cyan-500 text-cyan-950 hover:bg-cyan-600",
  };

  return (
    <AdminLayout title="Ranking de Aplicativos">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header com animação */}
        <div className="text-center py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-purple-400/10 to-yellow-400/10 rounded-lg blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className="w-10 h-10 text-yellow-500 animate-bounce" />
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-600 to-purple-600 bg-clip-text text-transparent">
                Ranking de Aplicativos
              </h1>
              <Trophy className="w-10 h-10 text-yellow-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
            <p className="text-muted-foreground text-lg">
              Veja quantos clientes estão usando todos os aplicativos cadastrados no painel
            </p>
          </div>
        </div>

        {/* Cards de Ranking - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ranking.map((app) => (
            <div key={app.name} className="relative group">
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${
                app.color === "yellow" 
                  ? "from-yellow-400/20 to-yellow-600/20" 
                  : app.color === "purple"
                    ? "from-purple-400/20 to-purple-600/20"
                    : "from-cyan-400/20 to-cyan-600/20"
              } rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <Card
                className={`border-2 ${colorClasses[app.color as keyof typeof colorClasses]} overflow-hidden relative transition-all duration-300 group-hover:shadow-lg group-hover:scale-105`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col h-full">
                    {/* Top section com posição */}
                    <div className={`bg-gradient-to-r ${
                      positionColors[app.position as keyof typeof positionColors] || "from-gray-400 to-gray-600"
                    } px-6 py-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className="text-white font-bold text-3xl">#{app.position}</div>
                        <div>
                          <div className="text-white text-sm font-semibold">Posição</div>
                          {app.position === 1 && (
                            <div className="text-yellow-200 text-xs font-bold">🔥 Mais Popular</div>
                          )}
                        </div>
                      </div>
                      <Badge className={`${badgeColors[app.color as keyof typeof badgeColors]} text-sm px-3 py-1 font-bold`}>
                        {app.percentage}%
                      </Badge>
                    </div>

                    {/* Middle section com logo e info */}
                    <div className="flex-1 p-6 flex items-center gap-4">
                      <img
                        src={app.logo}
                        alt={app.name}
                        className="w-24 h-24 rounded-xl object-cover shadow-md border-2 border-white/20"
                      />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{app.name}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold">
                              {app.users} {app.users === 1 ? "cliente" : "clientes"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">
                              {app.percentage}% de adoção
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-6 pb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${
                            app.color === "yellow"
                              ? "from-yellow-400 to-yellow-600"
                              : app.color === "purple"
                                ? "from-purple-400 to-purple-600"
                                : "from-cyan-400 to-cyan-600"
                          } transition-all duration-500`}
                          style={{ width: `${app.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Estatísticas detalhadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">usando aplicativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/40 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Líder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ranking[0]?.name || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">{ranking[0]?.users || 0} clientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                Taxa de Adoção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ranking[0]?.percentage || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">do líder</p>
            </CardContent>
          </Card>
        </div>

        {/* Comparação visual */}
        {totalUsers > 0 && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-lg">Comparação de Mercado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ranking.map((app) => (
                <div key={app.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{app.name}</span>
                    <span className="text-sm text-muted-foreground">{app.users} clientes</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        app.color === "yellow"
                          ? "from-yellow-400 to-yellow-600"
                              : app.color === "purple"
                                ? "from-purple-400 to-purple-600"
                                : "from-cyan-400 to-cyan-600"
                      } transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${app.percentage}%` }}
                    >
                      {app.percentage > 10 && (
                        <span className="text-white text-xs font-bold">{app.percentage}%</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando não há dados */}
        {totalUsers === 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                Nenhum cliente selecionou um aplicativo ainda. Os dados aparecerão aqui quando usuários forem cadastrados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
