import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Smartphone, Image, Upload } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  trial_title: "Acesso Bloqueado",
  trial_subtitle: "🚀 Assine agora e tenha acesso ilimitado a canais, filmes e séries!",
  trial_support_text: "Suporte com seu revendedor",
  trial_banner_url: "",
  trial_logo_url: "",
  trial_background_url: "",
  contact_website: "",
  contact_whatsapp: "",
  impact_phrase: "",
  contact_info: "",
  icon_live_tv_url: "",
  icon_movies_url: "",
  icon_series_url: "",
  icon_account_url: "",
  icon_change_playlist_url: "",
};

// Componente reutilizável para botão de upload que funciona corretamente
function UploadButton({ field, uploadingField, onUpload }: { field: string; uploadingField: string | null; onUpload: (field: string, file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onUpload(field, file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={uploadingField === field}
        title="Upload imagem"
        onClick={() => inputRef.current?.click()}
      >
        {uploadingField === field ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
      </Button>
    </>
  );
}

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const [uploadingField, setUploadingField] = useState<string | null>(null);

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
      // url já vem no formato https://renciaapp-ldyffp73.manus.space/manus-storage/...
      handleChange(field, url);
      await updateMany.mutateAsync({ ...form, [field]: url });
      toast.success("✅ Imagem enviada e salva! O APK buscará a nova imagem ao reiniciar.");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + (e.message ?? "erro desconhecido"));
    } finally {
      setUploadingField(null);
    }
  };

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
      <AdminLayout title="Configurações do App">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações do App">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personalize as imagens e textos exibidos no APK para seus clientes.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>

        <Tabs defaultValue="trial">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="trial" className="gap-2">
              <Smartphone size={14} /> Tela de Bloqueio
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tela Principal (Home)</CardTitle>
                <CardDescription>
                  Textos exibidos na tela principal do APK para todos os dispositivos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Frase de impacto (tela home)</Label>
                  <Textarea
                    value={form.impact_phrase}
                    onChange={e => handleChange("impact_phrase", e.target.value)}
                    placeholder="Ex: 🚀 O melhor IPTV do Brasil!"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Exibida em branco na parte inferior da tela home. Deixe vazio para ocultar.</p>
                </div>
                <div className="space-y-2">
                  <Label>Contato (tela home)</Label>
                  <Input
                    value={form.contact_info}
                    onChange={e => handleChange("contact_info", e.target.value)}
                    placeholder="Ex: WhatsApp: (11) 99999-9999"
                  />
                  <p className="text-xs text-muted-foreground">Exibido em dourado abaixo da frase de impacto. Deixe vazio para ocultar.</p>
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
                  Clique em <Upload size={12} className="inline" /> para enviar uma imagem. A URL é gerada automaticamente e o APK buscará a nova imagem ao reiniciar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Banner lateral (320×180px)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_banner_url}
                      onChange={e => handleChange("trial_banner_url", e.target.value)}
                      placeholder="https://exemplo.com/banner.png"
                    />
                    <UploadButton field="trial_banner_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
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
                  <Label>Logo do APK (home_logo)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_logo_url}
                      onChange={e => handleChange("trial_logo_url", e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                    />
                    <UploadButton field="trial_logo_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
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
                  <Label>Imagem de fundo principal (960×540px)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_background_url}
                      onChange={e => handleChange("trial_background_url", e.target.value)}
                      placeholder="https://exemplo.com/background.png"
                    />
                    <UploadButton field="trial_background_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Dinâmica:</strong> Ao salvar, o APK buscará esta imagem automaticamente ao reiniciar via <code>/api/v4/bg.php</code>.
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
                  Substitua os ícones dos botões principais do APK. Use o botão <Upload size={12} className="inline" /> para enviar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {([
                    { key: "icon_live_tv_url", label: "TV ao Vivo", hint: "tv_icon — 144×144px" },
                    { key: "icon_movies_url", label: "Filmes", hint: "movie_icon — 70×70px" },
                    { key: "icon_series_url", label: "Séries", hint: "icon_series — 70×70px" },
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
                            placeholder="https://..."
                            className="text-xs"
                          />
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        </div>
                        <UploadButton field={key} uploadingField={uploadingField} onUpload={handleFileUpload} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Nota:</strong> As imagens são servidas via <code>https://renciaapp-ldyffp73.manus.space/manus-storage/...</code>. Se você hospedar o servidor em outro domínio, basta atualizar a URL base no arquivo <code>server/apiRoutes.ts</code>.
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
    </AdminLayout>
  );
}
