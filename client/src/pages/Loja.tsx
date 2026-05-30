import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Download, Copy, Check, Smartphone, ExternalLink, Info, Save,
  Link2, Upload, FileUp, Trash2, Globe
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function Loja() {
  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateMany = trpc.settings.updateMany.useMutation({
    onSuccess: () => { refetch(); toast.success("Configurações salvas!"); }
  });

  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apkUrl = settings?.apk_download_url || "";
  const apkVersion = settings?.apk_version || "—";
  const apkFileName = settings?.apk_file_name || "";
  // Link encurtado do próprio domínio
  const ownShortUrl = typeof window !== "undefined"
    ? `${window.location.origin}/ouropro`
    : "/ouropro";

  useEffect(() => {
    if (settings) {
      setShortUrl(settings.apk_short_url || "");
    }
  }, [settings]);

  const handleCopy = (url: string, type: "full" | "short") => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      if (type === "full") { setCopiedFull(true); setTimeout(() => setCopiedFull(false), 2000); }
      else { setCopiedShort(true); setTimeout(() => setCopiedShort(false), 2000); }
      toast.success("Link copiado!");
    });
  };

  const handleSaveShortUrl = () => {
    updateMany.mutate({ apk_short_url: shortUrl });
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".apk")) {
      toast.error("Apenas arquivos .apk são permitidos");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 200MB");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("apk", file);
      // Upload com XMLHttpRequest para mostrar progresso
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 90));
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(new Error(xhr.responseText));
          }
        };
        xhr.onerror = () => reject(new Error("Erro de rede"));
        xhr.open("POST", "/api/upload-apk");
        xhr.send(formData);
      });
      toast.success("APK enviado com sucesso! Link encurtado gerado.");
      refetch();
    } catch (err) {
      toast.error("Erro ao enviar APK: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <AdminLayout title="Loja OuroPro">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
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

        {/* Card Upload APK */}
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp size={16} className="text-yellow-600" /> Upload do APK
            </CardTitle>
            <CardDescription>
              Envie o arquivo .apk diretamente para o servidor. Um link encurtado será gerado automaticamente com seu domínio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Área de drop */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                ${dragOver
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
                  : "border-muted-foreground/30 hover:border-yellow-400 hover:bg-muted/30"
                }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".apk,application/vnd.android.package-archive"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {uploading ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Upload size={32} className="text-yellow-500 animate-bounce" />
                  </div>
                  <p className="text-sm font-medium">Enviando APK...</p>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <Upload size={32} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium">
                    Arraste o .apk aqui ou <span className="text-yellow-600 underline">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Máximo 200MB · apenas .apk</p>
                  {apkFileName && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                      ✅ Atual: {apkFileName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Link encurtado do domínio */}
            {apkUrl && apkUrl.includes("/manus-storage/") && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                    Link encurtado do seu domínio
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 rounded-md border bg-white dark:bg-black/20 px-3 py-2">
                    <p className="text-sm font-mono font-bold text-green-700 dark:text-green-300 break-all">
                      {ownShortUrl}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-green-300"
                    onClick={() => handleCopy(ownShortUrl, "short")}
                  >
                    {copiedShort ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </Button>
                  <a href={ownShortUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="shrink-0 border-green-300 gap-1">
                      <Download size={13} /> Testar
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Compartilhe este link. Ele sempre aponta para o APK mais recente enviado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card links e configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone size={16} /> Download do APK Android
            </CardTitle>
            <CardDescription>
              Gerencie os links de download do OuroPro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {apkUrl ? (
              <>
                {/* Link atual */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Atual do APK</p>
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border bg-muted/50 px-3 py-2">
                      <p className="text-xs font-mono break-all text-foreground">{apkUrl}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleCopy(apkUrl, "full")} className="shrink-0">
                      {copiedFull ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>

                {/* Link externo alternativo */}
                <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                  <Label className="font-semibold flex items-center gap-2">
                    <Link2 size={14} /> Link Externo Alternativo
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={shortUrl}
                      onChange={e => setShortUrl(e.target.value)}
                      placeholder="https://bit.ly/ouropro ou outro link externo"
                      className="font-mono text-sm"
                    />
                    {shortUrl && (
                      <Button size="sm" variant="outline" onClick={() => handleCopy(shortUrl, "short")} className="shrink-0">
                        {copiedShort ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Opcional: cole aqui um link externo (bit.ly, etc.) como alternativa ao link do domínio acima.
                  </p>
                  <Button size="sm" onClick={handleSaveShortUrl} disabled={updateMany.isPending} className="gap-1.5">
                    <Save size={13} /> {updateMany.isPending ? "Salvando..." : "Salvar link externo"}
                  </Button>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={apkUrl.includes("/manus-storage/") ? ownShortUrl : apkUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
                      <Download size={16} /> Baixar OuroPro
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleCopy(
                      apkUrl.includes("/manus-storage/") ? ownShortUrl : apkUrl,
                      "full"
                    )}
                  >
                    {copiedFull ? (
                      <><Check size={16} className="text-green-500" /> Link Copiado!</>
                    ) : (
                      <><Copy size={16} /> Copiar Link</>
                    )}
                  </Button>
                </div>

                <a
                  href={apkUrl.includes("/manus-storage/") ? ownShortUrl : apkUrl}
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
                    Use o botão de upload acima para enviar o APK diretamente para o servidor.
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
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-semibold">Fire TV / Fire Stick (Amazon)</p>
                  <p className="text-xs text-muted-foreground">Compatível com APK Android. Use o mesmo APK acima via sideload ou Downloader.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-2xl">📺</span>
                <div>
                  <p className="font-semibold">Smart TV Samsung / LG (Tizen / webOS)</p>
                  <p className="text-xs text-muted-foreground">
                    Essas TVs <strong>não suportam APK Android</strong>. Precisam de app nativo publicado na loja da fabricante.
                  </p>
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
