import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, Smartphone, ExternalLink, Info } from "lucide-react";
import { useState } from "react";

export default function Loja() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [copied, setCopied] = useState(false);

  const apkUrl = settings?.apk_download_url || "";
  const apkVersion = settings?.apk_version || "—";

  const handleCopy = () => {
    if (!apkUrl) return;
    navigator.clipboard.writeText(apkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AdminLayout title="Loja OuroPro">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header com logo */}
        <div className="flex flex-col items-center gap-4 py-6">
          <img
            src="/manus-storage/ouropro_logo_c0c3caef.png"
            alt="OuroPro"
            className="w-32 h-32 rounded-full object-cover shadow-lg border-2 border-yellow-500"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">OuroPro</h1>
            <p className="text-muted-foreground text-sm">Aplicativo IPTV para Android</p>
          </div>
          {apkVersion !== "—" && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500 font-mono">
              Versão {apkVersion}
            </Badge>
          )}
        </div>

        {/* Card de download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone size={16} /> Download do APK Android
            </CardTitle>
            <CardDescription>
              Baixe o aplicativo OuroPro para dispositivos Android (smartphones, tablets, TV Box).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apkUrl ? (
              <>
                {/* Link do APK */}
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Link do APK</p>
                  <p className="text-xs font-mono break-all text-foreground">{apkUrl}</p>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={apkUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                      <Download size={16} /> Baixar OuroPro
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <><Check size={16} className="text-green-500" /> Link Copiado!</>
                    ) : (
                      <><Copy size={16} /> Copiar Link</>
                    )}
                  </Button>
                </div>

                {/* Testar link */}
                <a
                  href={apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink size={11} /> Abrir link em nova aba
                </a>
              </>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 flex items-start gap-3">
                <Info size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Nenhum APK configurado
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Vá em <strong>Configurações do App → Aba APK</strong> e cadastre o link de download do APK para que ele apareça aqui.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações sobre plataformas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info size={16} /> Compatibilidade de Plataformas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold">Android (Samsung, LG, Motorola, etc.)</p>
                  <p className="text-xs text-muted-foreground">Use o APK acima. Instale diretamente habilitando "Fontes desconhecidas" nas configurações.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">📺</span>
                <div>
                  <p className="font-semibold">Smart TV Samsung / LG (Tizen / webOS)</p>
                  <p className="text-xs text-muted-foreground">
                    Essas TVs <strong>não suportam APK Android</strong>. Precisam de app nativo publicado na Samsung App Store (Tizen) ou LG Content Store (webOS). São plataformas separadas com desenvolvimento próprio.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">🎬</span>
                <div>
                  <p className="font-semibold">Roku</p>
                  <p className="text-xs text-muted-forerer">
                    Roku usa sistema proprietário (Brightscript/SceneGraph). Requer desenvolvimento e publicação no Roku Channel Store. <strong>Não é compatível com APK Android.</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-semibold">Fire TV / Fire Stick (Amazon)</p>
                  <p className="text-xs text-muted-foreground">Compatível com APK Android. Use o mesmo APK acima via sideload ou Downloader.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">🍎</span>
                <div>
                  <p className="font-semibold">iOS / Apple TV</p>
                  <p className="text-xs text-muted-foreground">Requer app nativo publicado na App Store da Apple. Não aceita APK Android.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
