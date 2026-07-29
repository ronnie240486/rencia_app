import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface AppRanking {
  name: string;
  logo: string;
  color: string;
  users: number;
  position: number;
  percentage: number;
}

// Mapa de cores para diferentes apps
const APP_COLORS: Record<string, string> = {
  "OuroPro": "yellow",
  "Maximus": "purple",
  "OURO REVENDA": "yellow",
  "VU REVENDA": "blue",
  "TV ROKU -GPC PRO": "red",
  "ZONE X": "green",
  "UNI REVENDA": "indigo",
  "FACILITA": "orange",
  "GPC PRO ANDROID": "pink",
};

// Mapa de logos para diferentes apps
const APP_LOGOS: Record<string, string> = {
  "OuroPro": "/manus-storage/ouropro_logo_c0c3caef.png",
  "Maximus": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663162366914/PzXaZFHtEbexAZJA.png",
  "OURO REVENDA": "/manus-storage/ouropro_logo_c0c3caef.png",
  "VU REVENDA": "https://via.placeholder.com/100?text=VU",
  "TV ROKU -GPC PRO": "https://via.placeholder.com/100?text=ROKU",
  "ZONE X": "https://via.placeholder.com/100?text=ZONE",
  "UNI REVENDA": "https://via.placeholder.com/100?text=UNI",
  "FACILITA": "https://via.placeholder.com/100?text=FACILITA",
  "GPC PRO ANDROID": "https://via.placeholder.com/100?text=GPC",
};

export default function RankingApps() {
  const { data: devicesResponse } = trpc.devices.list.useQuery({ page: 1, pageSize: 1000 });
  const devices = devicesResponse?.data || [];

  // Contar usuários por aplicativo (usando coluna 'app')
  const appCounts = useMemo(() => {
    return devices.reduce(
      (acc: Record<string, number>, device: any) => {
        const app = device.app || "Sem App";
        acc[app] = (acc[app] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [devices]);

  const totalUsers = Object.values(appCounts).reduce((sum: number, count: number) => sum + count, 0);

  // Criar ranking dinamicamente com todos os apps
  const ranking: AppRanking[] = useMemo(() => {
    const apps = Object.entries(appCounts).map(([name, count]) => ({
      name,
      logo: APP_LOGOS[name] || `https://via.placeholder.com/100?text=${encodeURIComponent(name.substring(0, 5))}`,
      color: APP_COLORS[name] || "gray",
      users: count,
    }));

    return apps
      .sort((a, b) => b.users - a.users)
      .map((app, idx) => ({
        ...app,
        position: idx + 1,
        percentage: totalUsers > 0 ? Math.round((app.users / totalUsers) * 100) : 0,
      }));
  }, [appCounts, totalUsers]);

  const colorClasses: Record<string, string> = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 via-yellow-50 to-yellow-100/50 dark:from-yellow-950/40 dark:via-yellow-900/20 dark:to-yellow-800/30",
    purple: "border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:via-purple-900/20 dark:to-purple-800/30",
    blue: "border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:via-blue-900/20 dark:to-blue-800/30",
    red: "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 via-red-50 to-red-100/50 dark:from-red-950/40 dark:via-red-900/20 dark:to-red-800/30",
    green: "border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-green-50 to-green-100/50 dark:from-green-950/40 dark:via-green-900/20 dark:to-green-800/30",
    indigo: "border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:via-indigo-900/20 dark:to-indigo-800/30",
    orange: "border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:via-orange-900/20 dark:to-orange-800/30",
    pink: "border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50 via-pink-50 to-pink-100/50 dark:from-pink-950/40 dark:via-pink-900/20 dark:to-pink-800/30",
    gray: "border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/50 dark:from-gray-950/40 dark:via-gray-900/20 dark:to-gray-800/30",
  };

  const positionColors: Record<number, string> = {
    1: "from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-400/50",
    2: "from-gray-300 to-gray-500 shadow-lg shadow-gray-400/50",
    3: "from-orange-300 to-orange-600 shadow-lg shadow-orange-400/50",
  };

  const badgeColors: Record<string, string> = {
    yellow: "bg-yellow-500 text-yellow-900 hover:bg-yellow-600",
    purple: "bg-purple-500 text-white hover:bg-purple-600",
    blue: "bg-blue-500 text-white hover:bg-blue-600",
    red: "bg-red-500 text-white hover:bg-red-600",
    green: "bg-green-500 text-white hover:bg-green-600",
    indigo: "bg-indigo-500 text-white hover:bg-indigo-600",
    orange: "bg-orange-500 text-white hover:bg-orange-600",
    pink: "bg-pink-500 text-white hover:bg-pink-600",
    gray: "bg-gray-500 text-white hover:bg-gray-600",
  };

  return (
    <AdminLayout title="Ranking de Aplicativos">
      <div className="max-w-6xl mx-auto space-y-8">
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
              Veja quais aplicativos seus clientes estão usando
            </p>
          </div>
        </div>

        {/* Cards de Ranking - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ranking.map((app) => (
            <div key={app.name} className="relative group">
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-r ${
                app.color === "yellow" 
                  ? "from-yellow-400/20 to-yellow-600/20" 
                  : app.color === "purple"
                  ? "from-purple-400/20 to-purple-600/20"
                  : "from-blue-400/20 to-blue-600/20"
              } rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <Card
                className={`border-2 ${colorClasses[app.color as keyof typeof colorClasses] || colorClasses.gray} overflow-hidden relative transition-all duration-300 group-hover:shadow-lg group-hover:scale-105`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col h-full">
                    {/* Top section com posição */}
                    <div className={`bg-gradient-to-r ${
                      positionColors[app.position as keyof typeof positionColors] || "from-gray-400 to-gray-600"
                    } px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-white font-bold text-2xl">#{app.position}</div>
                        <div>
                          <div className="text-white text-xs font-semibold">Posição</div>
                          {app.position === 1 && (
                            <div className="text-yellow-200 text-xs font-bold">🔥 Líder</div>
                          )}
                        </div>
                      </div>
                      <Badge className={`${badgeColors[app.color as keyof typeof badgeColors] || badgeColors.gray} text-xs px-2 py-1 font-bold`}>
                        {app.percentage}%
                      </Badge>
                    </div>

                    {/* Middle section com logo e info */}
                    <div className="flex-1 p-4 flex flex-col items-center text-center gap-3">
                      <img
                        src={app.logo}
                        alt={app.name}
                        className="w-16 h-16 rounded-lg object-cover shadow-md border-2 border-white/20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://via.placeholder.com/64?text=${encodeURIComponent(app.name.substring(0, 3))}`;
                        }}
                      />
                      <div>
                        <h3 className="text-sm font-bold line-clamp-2">{app.name}</h3>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-sm">
                            {app.users} {app.users === 1 ? "cliente" : "clientes"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-4 pb-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${
                            app.color === "yellow"
                              ? "from-yellow-400 to-yellow-600"
                              : app.color === "purple"
                              ? "from-purple-400 to-purple-600"
                              : "from-blue-400 to-blue-600"
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
        {totalUsers > 0 && ranking.length > 0 && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-lg">Comparação de Mercado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ranking.map((app) => (
                <div key={app.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm line-clamp-1">{app.name}</span>
                    <span className="text-sm text-muted-foreground">{app.users} clientes</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        app.color === "yellow"
                          ? "from-yellow-400 to-yellow-600"
                          : app.color === "purple"
                          ? "from-purple-400 to-purple-600"
                          : "from-blue-400 to-blue-600"
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
