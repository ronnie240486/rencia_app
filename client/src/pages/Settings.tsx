import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Image, Upload, Palette, MessageCircle, Smartphone, LayoutGrid } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  // Imagens
  trial_banner_url: "",
  trial_logo_url: "",
  trial_background_url: "",
  sidebar_logo_url: "",
  // Contato
  contact_website: "",
  contact_whatsapp: "",
  impact_phrase: "",
  contact_info: "",
  // Tema
  primary_color: "#D4AF37",
  sidebar_color: "",
  text_color: "",
  // Ícones
  icon_reload_url: "",
  icon_exit_url: "",
  icon_settings_url: "",
  icon_account_url: "",
  icon_live_tv_url: "",
  icon_movies_url: "",
  icon_series_url: "",
  icon_change_playlist_url: "",
  // Tela de Bloqueio
  lock_title: "OuroPro",
  lock_message: "OuroPro is a media player application. The app does not provide or include any media or content.",
  lock_button_text: "Renovar Agora",
  lock_button_url: "",
  // Chatbot
  chatbot_dias_aviso: "3",
  chatbot_mensagem_vencimento: "Olá {nome}! Sua assinatura vence em {dias} dia(s) ({data}). Renove agora para não perder o acesso! 😊",
  // APK
  apk_download_url: "",
  apk_version: "",
  // Frase legal
  legal_notice: "OuroPro is a media player application. The app does not provide or include any media or content.",
  // Cores dos botões do painel
  panel_search_button_color: "#EF4444",
  panel_add_user_color: "#EF4444",
  panel_add_user_bottom_color: "#EF4444",
  panel_new_resale_color: "#EF4444",
  panel_active_color: "#EF4444",
  panel_all_color: "#EF4444",
  panel_selected_color: "#EF4444",
  panel_save_color: "#EF4444",
};

const SIDEBAR_PRESETS = [
  { name: "Escuro Padrão", value: "#1a1208" },
  { name: "Azul Escuro", value: "#0f172a" },
  { name: "Cinza Escuro", value: "#111827" },
  { name: "Verde Escuro", value: "#052e16" },
  { name: "Roxo Escuro", value: "#1e1b4b" },
  { name: "Vermelho Escuro", value: "#1c0a0a" },
  { name: "Marrom", value: "#1c1007" },
  { name: "Preto Puro", value: "#000000" },
];

const COLOR_PRESETS = [
  { name: "Dourado", value: "#D4AF37" },
  { name: "Laranja", value: "#F97316" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#22C55E" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Ciano", value: "#06B6D4" },
];

// Componente reutilizável para botão de upload
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
  const [sendingTest, setSendingTest] = useState(false);

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

  // Aplica cor do texto no painel ao mudar
  useEffect(() => {
    const tc = form.text_color;
    if (tc && tc.startsWith("#") && tc.length === 7) {
      document.documentElement.style.setProperty("--foreground", tc);
      document.documentElement.style.setProperty("--card-foreground", tc);
      document.documentElement.style.setProperty("--popover-foreground", tc);
    } else if (!tc) {
      // restaurar padrão
      document.documentElement.style.removeProperty("--foreground");
      document.documentElement.style.removeProperty("--card-foreground");
      document.documentElement.style.removeProperty("--popover-foreground");
    }
  }, [form.text_color]);

  // Aplica a cor primária no painel ao mudar
  useEffect(() => {
    const color = form.primary_color;
    if (color) {
      document.documentElement.style.setProperty("--primary-hex", color);
      // Converter hex para hsl para o Tailwind
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      document.documentElement.style.setProperty("--primary", hsl);
    }
  }, [form.primary_color]);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateMany.mutate(form);
    setDirty(false);
  };

  const handleTestChatbot = async () => {
    setSendingTest(true);
    try {
      const resp = await fetch("/api/chatbot/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dias: parseInt(form.chatbot_dias_aviso) || 3 }),
      });
      const data = await resp.json() as { sent?: number; message?: string };
      if (resp.ok) {
        toast.success(`✅ ${data.message || `${data.sent ?? 0} mensagem(ns) enviada(s)!`}`);
      } else {
        toast.error(data.message || "Erro ao disparar mensagens");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="OuroPro">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="OuroPro">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personalize imagens e ícones do aplicativo OuroPro.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2 btn-save">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>

        <Tabs defaultValue="banner">
          <TabsList className="grid grid-cols-2 w-full max-w-xs">
            <TabsTrigger value="banner" className="gap-1 text-xs">
              <Image size={13} /> Banner
            </TabsTrigger>
            <TabsTrigger value="icones" className="gap-1 text-xs">
              🖼️ Ícones
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
