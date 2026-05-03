import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Smartphone, Image, MessageSquare, Upload, CheckCircle2 } from "lucide-react";

const SETTING_KEYS = {
  // Tela Trial (bloqueio)
  trial_title: "Título da tela de bloqueio",
  trial_subtitle: "Subtítulo / frase de impacto",
  trial_support_text: "Texto de suporte (ex: contato WhatsApp)",
  trial_banner_url: "URL da imagem do banner lateral (320x180px)",
  trial_logo_url: "URL do logo superior esquerdo (home_logo)",
  trial_background_url: "URL da imagem de fundo (background1 - 960x540px)",
  // Textos do app
  app_channels_label: "Texto da aba Canais",
  app_movies_label: "Texto da aba Filmes",
  app_series_label: "Texto da aba Séries",
  // Info de contato
  contact_website: "URL do site (exibida na tela de bloqueio)",
  contact_whatsapp: "WhatsApp do suporte",
  // Ícones dos botões
  icon_live_tv_url: "URL do ícone TV ao Vivo",
  icon_movies_url: "URL do ícone Filmes",
  icon_series_url: "URL do ícone Séries",
  icon_account_url: "URL do ícone Account",
  icon_change_playlist_url: "URL do ícone Trocar Playlist",
};

const DEFAULT_VALUES: Record<string, string> = {
  trial_title: "Acesso Bloqueado",
  trial_subtitle: "🚀 Assine agora e tenha acesso ilimitado a canais, filmes e séries!",
  trial_support_text: "Suporte com seu revendedor",
  trial_banner_url: "",
  trial_logo_url: "",
  trial_background_url: "",
  app_channels_label: "Canais",
  app_movies_label: "Filmes",
  app_series_label: "Séries",
  contact_website: "",
  contact_whatsapp: "",
  icon_live_tv_url: "",
  icon_movies_url: "",
  icon_series_url: "",
  icon_account_url: "",
  icon_change_playlist_url: "",
};

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const uploadImage = trpc.settings.uploadImage.useMutation({
    onSuccess: (data, variables) => {
      handleChange(variables.field, data.url);
      toast.success("Imagem enviada! Clique em Salvar para aplicar.");
    },
    onError: (e) => toast.error("Erro ao enviar imagem: " + e.message),
  });
  const updateMany = trpc.settings.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas! As alterações serão aplicadas no próximo acesso do APK.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<Record<string, string>>(DEFAULT_VALUES);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(prev => {
        const merged = { ...DEFAULT_VALUES, ...prev };
        for (const [k, v] of Object.entries(settings)) {
          if (v !== undefined && v !== null) merged[k] = v;
        }
        return merged;
      });
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateMany.mutate(form);
    setDirty(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações do App</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize os textos e imagens exibidos no APK para seus clientes.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2">
          {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar Tudo
        </Button>
      </div>

      <Tabs defaultValue="trial">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="trial" className="gap-2">
            <Smartphone size={14} /> Tela de Bloqueio
          </TabsTrigger>
          <TabsTrigger value="labels" className="gap-2">
            <MessageSquare size={14} /> Textos do App
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-2">
            <Image size={14} /> Imagens
          </TabsTrigger>
        </TabsList>

        {/* Tela de Bloqueio (Trial) */}
        <TabsContent value="trial" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tela de Bloqueio</CardTitle>
              <CardDescription>
                Textos exibidos quando o device não está liberado no painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título da tela de bloqueio</Label>
                <Input
                  value={form.trial_title}
                  onChange={e => handleChange("trial_title", e.target.value)}
                  placeholder="Ex: Acesso Bloqueado"
                />
                <p className="text-xs text-muted-foreground">Substitui "Trial is ended" no APK.</p>
              </div>

              <div className="space-y-2">
                <Label>Frase de impacto / subtítulo</Label>
                <Textarea
                  value={form.trial_subtitle}
                  onChange={e => handleChange("trial_subtitle", e.target.value)}
                  placeholder="Ex: Assine agora e tenha acesso ilimitado!"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Substitui "To continue the app, please pay €7.9 via website or Google Pay."</p>
              </div>

              <div className="space-y-2">
                <Label>Texto de suporte</Label>
                <Input
                  value={form.trial_support_text}
                  onChange={e => handleChange("trial_support_text", e.target.value)}
                  placeholder="Ex: Suporte: (11) 99999-9999"
                />
                <p className="text-xs text-muted-foreground">Texto em amarelo abaixo do MAC address.</p>
              </div>

              <div className="space-y-2">
                <Label>URL do site (exibida na tela)</Label>
                <Input
                  value={form.contact_website}
                  onChange={e => handleChange("contact_website", e.target.value)}
                  placeholder="Ex: https://ourorevenda.manus.space"
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp do suporte</Label>
                <Input
                  value={form.contact_whatsapp}
                  onChange={e => handleChange("contact_whatsapp", e.target.value)}
                  placeholder="Ex: 5511999999999"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Textos do App */}
        <TabsContent value="labels" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Textos das Abas</CardTitle>
              <CardDescription>
                Nomes das seções exibidas no menu principal do APK.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aba Canais</Label>
                  <Input
                    value={form.app_channels_label}
                    onChange={e => handleChange("app_channels_label", e.target.value)}
                    placeholder="Canais"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aba Filmes</Label>
                  <Input
                    value={form.app_movies_label}
                    onChange={e => handleChange("app_movies_label", e.target.value)}
                    placeholder="Filmes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aba Séries</Label>
                  <Input
                    value={form.app_series_label}
                    onChange={e => handleChange("app_series_label", e.target.value)}
                    placeholder="Séries"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Imagens */}
        <TabsContent value="images" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Imagens do App</CardTitle>
              <CardDescription>
                URLs das imagens exibidas no APK. Use URLs públicas (https://).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Banner lateral (320×180px)</Label>
                <Input
                  value={form.trial_banner_url}
                  onChange={e => handleChange("trial_banner_url", e.target.value)}
                  placeholder="https://exemplo.com/banner.png"
                />
                <p className="text-xs text-muted-foreground">
                  Imagem exibida no canto inferior direito da tela de bloqueio. Tamanho recomendado: 320×180px.
                </p>
                {form.trial_banner_url && (
                  <img
                    src={form.trial_banner_url}
                    alt="Preview banner"
                    className="mt-2 rounded border max-h-24 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Logo superior esquerdo (home_logo)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.trial_logo_url}
                    onChange={e => handleChange("trial_logo_url", e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => uploadImage.mutate({ field: "trial_logo_url", dataUrl: reader.result as string, filename: file.name });
                      reader.readAsDataURL(file);
                    }} />
                    <Button type="button" variant="outline" size="icon" disabled={uploadImage.isPending} title="Upload imagem">
                      {uploadImage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Logo exibido no canto superior esquerdo do APK. Tamanho recomendado: 320×180px.
                </p>
                {form.trial_logo_url && (
                  <img
                    src={form.trial_logo_url}
                    alt="Preview logo"
                    className="mt-2 rounded border max-h-16 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Imagem de fundo principal (background1 - 960×540px)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.trial_background_url}
                    onChange={e => handleChange("trial_background_url", e.target.value)}
                    placeholder="https://exemplo.com/background.png"
                  />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => uploadImage.mutate({ field: "trial_background_url", dataUrl: reader.result as string, filename: file.name });
                      reader.readAsDataURL(file);
                    }} />
                    <Button type="button" variant="outline" size="icon" disabled={uploadImage.isPending} title="Upload imagem">
                      {uploadImage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Imagem dinâmica:</strong> Ao salvar, o APK buscará esta imagem automaticamente ao reiniciar. Substitui o fundo da tela principal. Tamanho recomendado: 960×540px.
                </p>
                {form.trial_background_url && (
                  <img
                    src={form.trial_background_url}
                    alt="Preview fundo"
                    className="mt-2 rounded border max-h-32 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image size={16} /> Ícones dos Botões
              </CardTitle>
              <CardDescription>
                Substitua os ícones dos botões principais do APK. O APK buscará as novas imagens automaticamente ao reiniciar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {([
                  { key: "icon_live_tv_url", label: "TV ao Vivo", hint: "tv_icon.png — 144×144px" },
                  { key: "icon_movies_url", label: "Filmes", hint: "movie_icon.png — 70×70px" },
                  { key: "icon_series_url", label: "Séries", hint: "icon_series.png — 70×70px" },
                  { key: "icon_account_url", label: "Account", hint: "Ícone da conta — 70×70px" },
                  { key: "icon_change_playlist_url", label: "Trocar Playlist", hint: "Ícone de troca — 70×70px" },
                ] as { key: string; label: string; hint: string }[]).map(({ key, label, hint }) => (
                  <div key={key} className="space-y-2">
                    <Label className="font-medium">{label}</Label>
                    <div className="flex gap-2 items-center">
                      {form[key] ? (
                        <img src={form[key]} alt={label} className="w-14 h-14 rounded border object-contain bg-black/10" onError={e => (e.currentTarget.style.display = "none")} />
                      ) : (
                        <div className="w-14 h-14 rounded border border-dashed flex items-center justify-center bg-muted text-muted-foreground text-xs text-center">sem ícone</div>
                      )}
                      <div className="flex-1 space-y-1">
                        <Input
                          value={form[key]}
                          onChange={e => handleChange(key, e.target.value)}
                          placeholder="https://exemplo.com/icone.png"
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground">{hint}</p>
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => uploadImage.mutate({ field: key, dataUrl: reader.result as string, filename: file.name });
                          reader.readAsDataURL(file);
                        }} />
                        <Button type="button" variant="outline" size="icon" disabled={uploadImage.isPending} title="Upload ícone">
                          {uploadImage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        </Button>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Nota:</strong> As imagens configuradas aqui são retornadas ao APK via servidor. Para substituir as imagens <em>embutidas</em> no APK (que aparecem antes da conexão), é necessário recompilar o APK com as novas imagens.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleSave} disabled={updateMany.isPending} size="lg" className="gap-2 shadow-lg">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Alterações
          </Button>
        </div>
      )}
    </div>
  );
}
