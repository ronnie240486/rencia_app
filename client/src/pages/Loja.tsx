import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Copy, Check, ExternalLink, Save, Link2, Edit2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AppConfig {
  name: string;
  logo: string;
  color: string;
  version: string;
  downloadUrl: string;
  shortUrl: string;
  settingKey: string;
}

const APPS: AppConfig[] = [
  {
    name: "OuroPro",
    logo: "/manus-storage/ouropro_logo_c0c3caef.png",
    color: "yellow",
    version: "1.0.0",
    downloadUrl: "https://example.com/ouropro.apk",
    shortUrl: "https://ouropro.link",
    settingKey: "ouropro",
  },
  {
    name: "Maximus Player",
    logo: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663162366914/PzXaZFHtEbexAZJA.png",
    color: "blue",
    version: "1.0.0",
    downloadUrl: "https://example.com/maximus.apk",
    shortUrl: "https://maximus.link",
    settingKey: "maximus",
  },
  {
    name: "Ultra Player",
    logo: "/manus-storage/ultra-player-logo_efd734bc.png",
    color: "purple",
    version: "1.0.0",
    downloadUrl: "https://example.com/ultra-player.apk",
    shortUrl: "https://ultra-player.link",
    settingKey: "ultra_player",
  },
];

function AppCard({ app }: { app: AppConfig }) {
  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateMany = trpc.settings.updateMany.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(`${app.name} atualizado!`);
      setEditMode(false);
    },
  });

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDownloadUrl, setEditDownloadUrl] = useState(app.downloadUrl);
  const [editShortUrl, setEditShortUrl] = useState(app.shortUrl);

  const handleCopy = (url: string, type: "full" | "short") => {
    navigator.clipboard.writeText(url).then(() => {
      if (type === "full") {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2000);
      } else {
        setCopiedShort(true);
        setTimeout(() => setCopiedShort(false), 2000);
      }
      toast.success("Link copiado!");
    });
  };

  const handleSave = () => {
    if (!editDownloadUrl.trim() || !editShortUrl.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    updateMany.mutate({
      [`${app.settingKey}_download_url`]: editDownloadUrl,
      [`${app.settingKey}_short_url`]: editShortUrl,
    });
  };

  const colorClasses = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20",
  };

  const buttonClasses = {
    yellow: "bg-yellow-600 hover:bg-yellow-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    purple: "bg-purple-600 hover:bg-purple-700",
  };

  const currentDownloadUrl = editMode ? editDownloadUrl : app.downloadUrl;
  const currentShortUrl = editMode ? editShortUrl : app.shortUrl;

  return (
    <Card className={colorClasses[app.color as keyof typeof colorClasses]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={app.logo} alt={app.name} className="w-16 h-16 rounded-lg object-cover" />
            <div>
              <CardTitle className="text-lg">{app.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                v{app.version}
              </Badge>
            </div>
          </div>
          {!editMode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(true)}
              className="gap-1"
            >
              <Edit2 size={14} /> Editar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {editMode ? (
          <>
            {/* Link Original - Edição */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Link Original</Label>
              <Input
                value={editDownloadUrl}
                onChange={(e) => setEditDownloadUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-sm"
              />
            </div>

            {/* Link Encurtado - Edição */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <Link2 size={12} /> Link Encurtado
              </Label>
              <Input
                value={editShortUrl}
                onChange={(e) => setEditShortUrl(e.target.value)}
                placeholder="https://..."
                className="font-mono text-sm"
              />
            </div>

            {/* Botões de Ação - Edição */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={updateMany.isPending}
                className={`flex-1 gap-2 text-white font-semibold ${buttonClasses[app.color as keyof typeof buttonClasses]}`}
              >
                <Save size={16} /> {updateMany.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  setEditDownloadUrl(app.downloadUrl);
                  setEditShortUrl(app.shortUrl);
                }}
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Link Original */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Link Original</Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border bg-white dark:bg-black/20 px-3 py-2">
                  <p className="text-xs font-mono break-all text-foreground">{currentDownloadUrl}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(currentDownloadUrl, "full")}
                  className="shrink-0"
                >
                  {copiedFull ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            {/* Link Encurtado */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <Link2 size={12} /> Link Encurtado
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border bg-white dark:bg-black/20 px-3 py-2">
                  <p className="text-xs font-mono break-all text-foreground font-bold">{currentShortUrl}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(currentShortUrl, "short")}
                  className="shrink-0"
                >
                  {copiedShort ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 pt-2">
              <a href={currentDownloadUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className={`w-full gap-2 text-white font-semibold ${buttonClasses[app.color as keyof typeof buttonClasses]}`}>
                  <Download size={16} /> Baixar
                </Button>
              </a>
              <a href={currentShortUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink size={14} /> Abrir
                </Button>
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Loja() {
  return (
    <AdminLayout title="Loja de Aplicativos">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold tracking-tight">Loja de Aplicativos</h1>
          <p className="text-muted-foreground mt-2">Baixe os aplicativos disponíveis</p>
        </div>

        {/* Grid de Apps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {APPS.map((app) => (
            <AppCard key={app.name} app={app} />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
