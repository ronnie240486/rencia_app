import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Upload, Image, Trash2, Plus, GripVertical, Sparkles, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AdminLayout from "@/components/AdminLayout";

export default function Interactive() {
  const { data: config, isLoading: loadingConfig, refetch: refetchConfig } = trpc.interactive.getConfig.useQuery();
  const { data: banners, isLoading: loadingBanners, refetch: refetchBanners } = trpc.interactive.getBanners.useQuery();
  const { data: introConfig } = trpc.appIntro.getConfig.useQuery();
  const updateIntroMutation = trpc.appIntro.updateConfig.useMutation();
  
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({
    backgroundUrl: "",
    appName: "InteractivePro",
    appLogo: "",
    autoplayInterval: 5000,
  });

  const [bannerForm, setBannerForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "image" as "image" | "video",
    urlMedia: "",
    duracao: 5,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setForm({
        backgroundUrl: config.backgroundUrl || "",
        appName: config.appName || "InteractivePro",
        appLogo: config.appLogo || "",
        autoplayInterval: config.autoplayInterval || 5000,
      });
    }
  }, [config]);

  const updateConfig = trpc.interactive.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ Configurações salvas!");
      setDirty(false);
      refetchConfig();
    },
    onError: (e) => toast.error(e.message),
  });

  const createBanner = trpc.interactive.createBanner.useMutation({
    onSuccess: () => {
      toast.success("✅ Banner adicionado!");
      setBannerForm({ titulo: "", descricao: "", tipo: "image", urlMedia: "", duracao: 5 });
      refetchBanners();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBanner = trpc.interactive.deleteBanner.useMutation({
    onSuccess: () => {
      toast.success("✅ Banner removido!");
      refetchBanners();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (field: string, file: File) => {
    try {
      setUploadingField(field);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("field", field);

      const resp = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const { url } = await resp.json() as { url: string };
      setForm(prev => ({ ...prev, [field]: url }));
      setDirty(true);
      toast.success("✅ Imagem enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + (e.message ?? "erro desconhecido"));
    } finally {
      setUploadingField(null);
    }
  };

  const handleChange = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateConfig.mutate(form);
  };

  const handleAddBanner = () => {
    if (!bannerForm.titulo || !bannerForm.urlMedia) {
      toast.error("Preencha título e URL da mídia");
      return;
    }
    createBanner.mutate(bannerForm);
  };

  if (loadingConfig || loadingBanners) {
    return (
      <AdminLayout title="Interactive">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Interactive">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">InteractivePro</h1>
            <p className="text-muted-foreground text-sm">
              Personalize a aparência e configure banners dinâmicos
            </p>
          </div>
          <Button onClick={handleSave} disabled={!dirty || updateConfig.isPending} className="gap-2 btn-save">
            {updateConfig.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Configurações
          </Button>
        </div>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2">
            <TabsTrigger value="config" className="flex gap-2">
              <Image size={16} /> Configurações
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex gap-2">
              <Plus size={16} /> Banners
            </TabsTrigger>
            <TabsTrigger value="intro" className="flex gap-2">
              <Sparkles size={16} /> Logo Animado
            </TabsTrigger>
          </TabsList>

          {/* ─── Aba Configurações ─────────────────────────────────────────────────────────────── */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Personalize a aparência do InteractivePro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Nome do App */}
                <div className="space-y-2">
                  <Label className="font-semibold">Nome do App</Label>
                  <Input
                    value={form.appName}
                    onChange={e => handleChange("appName", e.target.value)}
                    placeholder="InteractivePro"
                  />
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label className="font-semibold">Logo do App</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.appLogo}
                      onChange={e => handleChange("appLogo", e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={uploadingField === "appLogo"}
                      title="Upload logo"
                      onClick={() => inputRef.current?.click()}
                    >
                      {uploadingField === "appLogo" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    </Button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload("appLogo", file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {form.appLogo && (
                    <img
                      src={form.appLogo}
                      alt="Preview logo"
                      className="mt-2 rounded border max-h-16 object-contain"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>

                {/* Imagem de Fundo */}
                <div className="space-y-2">
                  <Label className="font-semibold">Imagem de Fundo (960×540px)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.backgroundUrl}
                      onChange={e => handleChange("backgroundUrl", e.target.value)}
                      placeholder="https://exemplo.com/background.png"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={uploadingField === "backgroundUrl"}
                      title="Upload fundo"
                      onClick={() => inputRef.current?.click()}
                    >
                      {uploadingField === "backgroundUrl" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    </Button>
                  </div>
                  {form.backgroundUrl && (
                    <img
                      src={form.backgroundUrl}
                      alt="Preview fundo"
                      className="mt-2 rounded border max-h-32 object-contain"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>

                {/* Intervalo de Carousel */}
                <div className="space-y-2">
                  <Label className="font-semibold">Intervalo de Carousel (ms)</Label>
                  <Input
                    type="number"
                    value={form.autoplayInterval}
                    onChange={e => handleChange("autoplayInterval", parseInt(e.target.value) || 5000)}
                    placeholder="5000"
                    min="1000"
                    step="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo em milissegundos entre cada banner (ex: 5000 = 5 segundos)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Aba Banners ────────────────────────────────────────────────────── */}
          <TabsContent value="banners" className="space-y-4 mt-4">
            {/* Adicionar Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adicionar Novo Banner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={bannerForm.titulo}
                    onChange={e => setBannerForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ex: Banner Promocional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={bannerForm.descricao}
                    onChange={e => setBannerForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição do banner"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <select
                      value={bannerForm.tipo}
                      onChange={e => setBannerForm(prev => ({ ...prev, tipo: e.target.value as "image" | "video" }))}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                  </div>

                  {bannerForm.tipo === "video" && (
                    <div className="space-y-2">
                      <Label>Duração (segundos)</Label>
                      <Input
                        type="number"
                        value={bannerForm.duracao}
                        onChange={e => setBannerForm(prev => ({ ...prev, duracao: parseInt(e.target.value) || 5 }))}
                        min="1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>URL da Mídia</Label>
                  <Input
                    value={bannerForm.urlMedia}
                    onChange={e => setBannerForm(prev => ({ ...prev, urlMedia: e.target.value }))}
                    placeholder="https://exemplo.com/banner.png"
                  />
                </div>

                <Button
                  onClick={handleAddBanner}
                  disabled={createBanner.isPending}
                  className="w-full gap-2"
                >
                  {createBanner.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Adicionar Banner
                </Button>
              </CardContent>
            </Card>

            {/* Lista de Banners */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Banners Ativos</h3>
              {banners && banners.length > 0 ? (
                banners.map((banner, idx) => (
                  <Card key={banner.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <GripVertical size={16} className="text-muted-foreground" />
                            <h4 className="font-semibold">{banner.titulo}</h4>
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                              {banner.tipo === "image" ? "🖼️ Imagem" : "🎬 Vídeo"}
                            </span>
                          </div>
                          {banner.descricao && <p className="text-sm text-muted-foreground">{banner.descricao}</p>}
                          <p className="text-xs text-muted-foreground truncate">URL: {banner.urlMedia}</p>
                          {banner.tipo === "video" && (
                            <p className="text-xs text-muted-foreground">Duração: {banner.duracao}s</p>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteBanner.mutate(banner.id)}
                          disabled={deleteBanner.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhum banner adicionado ainda. Crie o primeiro!
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ─── Aba Logo Animado ──────────────────────────────────────────────────────────────── */}
          <TabsContent value="intro" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo Animado com Som</CardTitle>
                <CardDescription>Configure o logo e som que aparecem na introdução do InteractivePro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium mb-2">URL do Logo Animado</Label>
                  <Input
                    placeholder="https://exemplo.com/logo.gif"
                    value={introConfig?.logoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/interactive-pro-icon-black-bg-UpRyNZr5jniotiDTrU6eFB.png"}
                    onChange={(e) => updateIntroMutation.mutate({ logoUrl: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Aceita GIF, PNG ou vídeo MP4</p>
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">URL do Som</Label>
                  <Input
                    placeholder="https://exemplo.com/som.mp3"
                    value={introConfig?.soundUrl || ""}
                    onChange={(e) => updateIntroMutation.mutate({ soundUrl: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Aceita MP3, WAV ou OGG</p>
                </div>

                <div>
                  <Label className="block text-sm font-medium mb-2">Duração (ms)</Label>
                  <Input
                    type="number"
                    min="1000"
                    max="10000"
                    step="100"
                    value={introConfig?.duracao || 3000}
                    onChange={(e) => updateIntroMutation.mutate({ duracao: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Tempo de exibição em milissegundos</p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="habilitado"
                    checked={introConfig?.habilitado !== false}
                    onCheckedChange={(checked) =>
                      updateIntroMutation.mutate({ habilitado: checked as boolean })
                    }
                  />
                  <Label htmlFor="habilitado" className="text-sm font-medium cursor-pointer">
                    Habilitar introdução animada
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      updateIntroMutation.mutate({
                        logoUrl: introConfig?.logoUrl,
                        soundUrl: introConfig?.soundUrl,
                        duracao: introConfig?.duracao,
                      })
                    }
                    disabled={updateIntroMutation.isPending}
                    className="flex-1"
                  >
                    Salvar Configurações
                  </Button>
                  {introConfig?.soundUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const audio = new Audio(introConfig.soundUrl);
                        audio.play().catch(() => toast.error("Erro ao reproduzir som"));
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Testar Som
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {introConfig?.habilitado ? (
                  <div className="bg-black rounded-lg p-8 flex items-center justify-center min-h-64">
                    {introConfig?.logoUrl ? (
                      <div className="text-center">
                        <img
                          src={introConfig.logoUrl}
                          alt="Logo Preview"
                          className="max-w-48 max-h-48 mx-auto rounded"
                          onError={() => (
                            <div className="text-gray-400">Logo não carregou</div>
                          )}
                        />
                        <p className="text-white text-sm mt-4">
                          Duração: {introConfig.duracao}ms
                          {introConfig.soundUrl && " + Som"}
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center">
                        <p>Adicione a URL do logo para ver o preview</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 flex items-center justify-center min-h-64">
                    <p className="text-gray-500 dark:text-gray-400">Introdução desabilitada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
