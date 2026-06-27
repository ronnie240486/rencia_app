import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Image, Upload, LayoutGrid } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  trial_banner_url: "",
  trial_logo_url: "",
  trial_background_url: "",
  sidebar_logo_url: "",
  contact_website: "",
  contact_whatsapp: "",
  impact_phrase: "",
  contact_info: "",
  lock_title: "OuroPro",
  lock_message: "OuroPro is a media player application. The app does not provide or include any media or content.",
  lock_button_text: "Renovar Agora",
  lock_button_url: "",
  legal_notice: "OuroPro is a media player application. The app does not provide or include any media or content.",
  icon_reload_url: "",
  icon_exit_url: "",
  icon_settings_url: "",
  icon_account_url: "",
  icon_live_tv_url: "",
  icon_movies_url: "",
  icon_series_url: "",
  icon_change_playlist_url: "",
};

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

export default function SettingsOuroPro() {
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
      handleChange(field, url);
      await updateMany.mutateAsync({ ...form, [field]: url });
      toast.success("✅ Imagem enviada e salva!");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + (e.message ?? "erro desconhecido"));
    } finally {
      setUploadingField(null);
    }
  };

  const updateMany = trpc.settings.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<Record<string, string>>(DEFAULT_VALUES);
  const [dirty, setDirty] = useState(false);

  useState(() => {
    if (settings) {
      setForm(prev => {
        const merged = { ...DEFAULT_VALUES, ...prev };
        for (const [k, v] of Object.entries(settings)) {
          if (v !== undefined && v !== null) merged[k] = v as string;
        }
        return merged;
      });
    }
  });

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
      <AdminLayout title="Configurações OuroPro">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações OuroPro">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Configure imagens e ícones do aplicativo OuroPro.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2 btn-save">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>

        <Tabs defaultValue="banner">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="banner" className="gap-1 text-xs">
              <Image size={13} /> Banner
            </TabsTrigger>
            <TabsTrigger value="icones" className="gap-1 text-xs">
              <LayoutGrid size={13} /> Ícones
            </TabsTrigger>
          </TabsList>

          {/* ─── Aba Banner ──────────────────────────────────────────────── */}
          <TabsContent value="banner" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Imagens do Painel e APK</CardTitle>
                <CardDescription>
                  Clique em <Upload size={12} className="inline" /> para enviar uma imagem. A URL é gerada automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Banner do APK */}
                <div className="space-y-2">
                  <Label className="font-semibold">Banner do APK (320×180px)</Label>
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
                      className="mt-2 rounded border max-h-28 object-contain"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>

                {/* Logo do APK */}
                <div className="space-y-2">
                  <Label className="font-semibold">Logo do APK (home_logo)</Label>
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

                {/* Fundo principal */}
                <div className="space-y-2">
                  <Label className="font-semibold">Imagem de fundo principal (960×540px)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_background_url}
                      onChange={e => handleChange("trial_background_url", e.target.value)}
                      placeholder="https://exemplo.com/background.png"
                    />
                    <UploadButton field="trial_background_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Servida via <code>/api/v4/bg.php</code> — o APK buscará ao reiniciar.
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

                {/* Logo da Sidebar do Painel */}
                <div className="space-y-2">
                  <Label className="font-semibold">Logo da Sidebar do Painel</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.sidebar_logo_url}
                      onChange={e => handleChange("sidebar_logo_url", e.target.value)}
                      placeholder="https://exemplo.com/sidebar-logo.png"
                    />
                    <UploadButton field="sidebar_logo_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Logo exibida na barra lateral do painel (substitui o logo padrão OuroPro).
                  </p>
                  {form.sidebar_logo_url && (
                    <img
                      src={form.sidebar_logo_url}
                      alt="Preview sidebar logo"
                      className="mt-2 rounded border max-h-16 object-contain"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Aba Ícones ──────────────────────────────────────────────── */}
          <TabsContent value="icones" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid size={16} /> Ícones dos Botões do APK
                </CardTitle>
                <CardDescription>
                  Personalize os ícones exibidos nos botões do app. Deixe em branco para usar o ícone padrão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "icon_reload_url", label: "Ícone Recarregar (reload)" },
                  { key: "icon_exit_url", label: "Ícone Sair (exit)" },
                  { key: "icon_settings_url", label: "Ícone Configurações (settings)" },
                  { key: "icon_account_url", label: "Ícone Conta / Perfil (account)" },
                  { key: "icon_live_tv_url", label: "Ícone TV ao Vivo (live_tv)" },
                  { key: "icon_movies_url", label: "Ícone Filmes (movies)" },
                  { key: "icon_series_url", label: "Ícone Séries (series)" },
                  { key: "icon_change_playlist_url", label: "Ícone Trocar Playlist (change_playlist)" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label className="font-semibold">{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form[key] || ""}
                        onChange={e => handleChange(key, e.target.value)}
                        placeholder="https://exemplo.com/icone.png"
                      />
                      <UploadButton field={key} uploadingField={uploadingField} onUpload={handleFileUpload} />
                    </div>
                    {form[key] && (
                      <img
                        src={form[key]}
                        alt={label}
                        className="mt-1 rounded border max-h-12 object-contain"
                        onError={e => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                ))}
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <strong>Como funciona:</strong> O APK busca os ícones via <code>/api/v4/icon/:nome</code>. Se você cadastrar uma URL aqui, o servidor redireciona para ela. Caso contrário, usa o ícone padrão do servidor.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {dirty && (
          <div className="fixed bottom-6 right-6">
            <Button onClick={handleSave} disabled={updateMany.isPending} size="lg" className="gap-2 shadow-lg btn-save">
              {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Alterações
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
