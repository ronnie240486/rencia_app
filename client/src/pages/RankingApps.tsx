import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AppRanking {
  name: string;
  logo: string;
  color: string;
  users: number;
  position: number;
}

export default function RankingApps() {
  const { data: devicesResponse } = trpc.devices.list.useQuery({ page: 1, pageSize: 1000 });
  const devices = devicesResponse?.data || [];

  // Contar usuários por aplicativo
  const appCounts = devices.reduce(
    (acc: Record<string, number>, device: any) => {
      const app = device.currentContent || "Sem App";
      acc[app] = (acc[app] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  // Criar ranking
  const ranking: AppRanking[] = [
    {
      name: "OuroPro",
      logo: "/manus-storage/ouropro_logo_c0c3caef.png",
      color: "yellow",
      users: appCounts["OuroPro"] || 0,
      position: 0,
    },
    {
      name: "Maximus Player",
      logo: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663162366914/PzXaZFHtEbexAZJA.png",
      color: "blue",
      users: appCounts["Maximus Player"] || 0,
      position: 0,
    },
  ]
    .sort((a, b) => b.users - a.users)
    .map((app, idx) => ({ ...app, position: idx + 1 }));

  const colorClasses = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30",
    blue: "border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30",
  };

  const positionColors = {
    1: "from-yellow-400 to-yellow-600",
    2: "from-gray-300 to-gray-500",
    3: "from-orange-300 to-orange-600",
  };

  return (
    <AdminLayout title="Ranking de Aplicativos">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold tracking-tight">Ranking de Aplicativos</h1>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-muted-foreground">Aplicativos mais usados pelos seus clientes neste momento</p>
        </div>

        {/* Ranking Cards */}
        <div className="space-y-4">
          {ranking.map((app) => (
            <Card
              key={app.name}
              className={`border-2 ${colorClasses[app.color as keyof typeof colorClasses]} overflow-hidden`}
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-6">
                  {/* Posição */}
                  <div
                    className={`flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${
                      positionColors[app.position as keyof typeof positionColors] || "from-gray-400 to-gray-600"
                    } text-white font-bold text-2xl shadow-lg`}
                  >
                    {app.position}°
                  </div>

                  {/* Logo */}
                  <img
                    src={app.logo}
                    alt={app.name}
                    className="w-20 h-20 rounded-lg object-cover shadow-md"
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{app.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {app.users} {app.users === 1 ? "cliente" : "clientes"} usando
                      </span>
                    </div>
                  </div>

                  {/* Badge */}
                  {app.position === 1 && (
                    <Badge className="bg-yellow-500 text-black text-sm px-3 py-1">
                      🔥 Mais Popular
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total de clientes usando apps:</span>
              <span className="font-bold text-lg">{ranking.reduce((sum, app) => sum + app.users, 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">App mais popular:</span>
              <span className="font-bold text-lg">{ranking[0]?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Taxa de adoção:</span>
              <span className="font-bold text-lg">
                {ranking[0]?.users && ranking.reduce((sum, app) => sum + app.users, 0) > 0
                  ? Math.round(
                      (ranking[0].users / ranking.reduce((sum, app) => sum + app.users, 0)) * 100
                    )
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
