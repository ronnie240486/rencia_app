import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Copy, Check, Smartphone, ExternalLink, Info, Save, Link2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Loja() {
  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateMany = trpc.settings.updateMany.useMutation({ onSuccess: () => { refetch(); toast.success("Configurações salvas!"); } });

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [useShort, setUseShort] = useState(false);

  const apkUrl = settings?.apk_download_url || "";
  const apkVersion = settings?.apk_version || "—";

  useEffect(() => {
    if (settings) {
      setShortUrl(settings.apk_short_url || "");
      setUseShort(settings.apk_use_short_url === "true");
    }
  }, [settings]);

  const activeLink = useShort && shortUrl ? shortUrl : apkUrl;

  const handleCopy = (url: string, type: "full" | "short") => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      if (type === "full") { setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); }
      else { setCopiedShort(true); setTimeout(() => setCopiedShort(false), 2000); }
    });
  };

  const handleSave = () => {
    updateMany.mutate({
      apk_short_url: shortUrl,
      apk_use_short_url: useShort ? "true" : "false",
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
          <CardContent className="space-y-5">
            {apkUrl ? (
              <>
                {/* Link completo */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Completo do APK</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border bg-muted/50 px-3 py-2">
                      <p className="text-xs font-mono break-all text-foreground">{apkUrl}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleCopy(apkUrl, "full")} className="shrink-0">
                      {copiedFull ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>

                {/* Link encurtado */}
                <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold flex items-center gap-2">
                      <Link2 size={14} /> Link Encurtado
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Usar link encurtado</span>
                      <Switch checked={useShort} onCheckedChange={setUseShort} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={shortUrl}
                      onChange={e => setShortUrl(e.target.value)}
                      placeholder="https://bit.ly/ouropro ou https://encurtador.com/xyz"
                      className="font-mono text-sm"
                    />
                    {shortUrl && (
                      <Button size="sm" variant="outline" onClick={() => handleCopy(shortUrl, "short")} className="shrink-0">
                        {copiedShort ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cole aqui um link encurtado (bit.ly, encurtador.com.br, etc.). Ative o toggle para usar esse link nos botões abaixo.
                  </p>
                  <Button size="sm" onClick={handleSave} disabled={updateMany.isPending} className="gap-1.5">
                    <Save size={13} /> {updateMany.isPending ? "Salvando..." : "Salvar configurações"}
                  </Button>
                </div>

                {/* Link ativo */}
                {useShort && shortUrl && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 px-3 py-2">
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                      ✅ Usando link encurtado: <span className="font-mono">{shortUrl}</span>
                    </p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={activeLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                      <Download size={16} /> Baixar OuroPro
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleCopy(activeLink, useShort && shortUrl ? "short" : "full")}
                  >
                    {(copiedFull || copiedShort) ? (
                      <><Check size={16} className="text-green-500" /> Link Copiado!</>
                    ) : (
                      <><Copy size={16} /> Copiar Link</>
                    )}
                  </Button>
                </div>

                <a
                  href={activeLink}
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
                  <p className="text-xs text-muted-foreground">
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
