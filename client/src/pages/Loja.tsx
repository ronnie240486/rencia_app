import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Copy, Check, ExternalLink, Save, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AppConfig {
  name: string;
  logo: string;
  color: string;
  version: string;
  downloadUrl: string;
  shortUrl: string;
}

const APPS: AppConfig[] = [
  {
    name: "OuroPro",
    logo: "/manus-storage/ouropro_logo_c0c3caef.png",
    color: "yellow",
    version: "1.0.0",
    downloadUrl: "https://example.com/ouropro.apk",
    shortUrl: "https://ouropro.link",
  },
  {
    name: "Maximus Player",
    logo: "/manus-storage/maximus_logo.png",
    color: "blue",
    version: "1.0.0",
    downloadUrl: "https://example.com/maximus.apk",
    shortUrl: "https://maximus.link",
  },
];

function AppCard({ app }: { app: AppConfig }) {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);

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

  const colorClasses = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
  };

  const buttonClasses = {
    yellow: "bg-yellow-600 hover:bg-yellow-700",
    blue: "bg-blue-600 hover:bg-blue-700",
  };

  return (
    <Card className={colorClasses[app.color as keyof typeof colorClasses]}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <img src={app.logo} alt={app.name} className="w-16 h-16 rounded-lg object-cover" />
          <div>
            <CardTitle className="text-lg">{app.name}</CardTitle>
            <Badge variant="outline" className="mt-1">
              v{app.version}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Link Original */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider">Link Original</Label>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border bg-white dark:bg-black/20 px-3 py-2">
              <p className="text-xs font-mono break-all text-foreground">{app.downloadUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(app.downloadUrl, "full")}
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
              <p className="text-xs font-mono break-all text-foreground font-bold">{app.shortUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(app.shortUrl, "short")}
              className="shrink-0"
            >
              {copiedShort ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </Button>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-2">
          <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className={`w-full gap-2 text-white font-semibold ${buttonClasses[app.color as keyof typeof buttonClasses]}`}>
              <Download size={16} /> Baixar
            </Button>
          </a>
          <a href={app.shortUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink size={14} /> Abrir
            </Button>
          </a>
        </div>
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
