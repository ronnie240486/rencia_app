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
  trial_background_carousel: "",
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

// Componente para carousel de fundo
function BackgroundCarousel({ urls, onRemove }: { urls: string[]; onRemove?: (index: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (urls.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % urls.length);
      }, 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [urls.length]);

  if (urls.length === 0) return null;

  const handleRemove = () => {
    if (onRemove) {
      onRemove(currentIndex);
    }
  };

  return (
    <div className="mt-2 rounded border overflow-hidden max-h-32 relative bg-black group">
      <img
        src={urls[currentIndex]}
        alt={`Fundo ${currentIndex + 1}`}
        className="w-full h-full object-contain"
        onError={e => (e.currentTarget.style.display = "none")}
      />
      {urls.length > 1 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          {urls.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remover esta imagem"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Componente reutilizável para botão de upload
function UploadButton({ field, uploadingField, onUpload }: { field: string; uploadingField: string | null; onUpload: (field: string, file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={field === "trial_background_url"}
        className="hidden"
        onChange={e => {
          const files = e.target.files;
          if (files) {
            for (let i = 0; i < Math.min(files.length, 8); i++) {
              onUpload(field, files[i]);
            }
          }
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
      
      if (field === "trial_background_url") {
        const currentUrls = form[field] ? form[field].split(',').map(u => u.trim()).filter(u => u) : [];
        if (currentUrls.length < 8) {
          const newUrls = [...currentUrls, url].join(', ');
          handleChange(field, newUrls);
          await updateMany.mutateAsync({ ...form, [field]: newUrls });
          toast.success(`✅ Imagem ${currentUrls.length + 1}/8 adicionada!`);
        } else {
          toast.error("Máximo de 8 imagens atingido");
        }
      } else {
        handleChange(field, url);
        await updateMany.mutateAsync({ ...form, [field]: url });
        toast.success("✅ Imagem enviada e salva!");
      }
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
            Personalize imagens, cores e mensagens automáticas do seu painel.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>

        <Tabs defaultValue="banner">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="banner" className="gap-1 text-xs">
              <Image size={13} /> Banner
            </TabsTrigger>
            <TabsTrigger value="tema" className="gap-1 text-xs">
              <Palette size={13} /> Tema
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="gap-1 text-xs">
              <MessageCircle size={13} /> Chatbot
            </TabsTrigger>
            <TabsTrigger value="apk" className="gap-1 text-xs">
              <Smartphone size={13} /> APK
            </TabsTrigger>
            <TabsTrigger value="icones" className="gap-1 text-xs">
              <LayoutGrid size={13} /> Ícones
            </TabsTrigger>
          </TabsList>

          {/* ─── Aba Banner / Logo ─────────────────────────────────────────── */}
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

                {/* Fundo principal com Carousel */}
                <div className="space-y-2">
                  <Label className="font-semibold">Imagem de fundo principal (960×540px) - Carousel até 8 imagens</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_background_url}
                      onChange={e => handleChange("trial_background_url", e.target.value)}
                      placeholder="https://exemplo.com/background.png"
                    />
                    <UploadButton field="trial_background_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Servida via <code>/api/v4/bg.php</code> — o APK buscará ao reiniciar. Separe múltiplas URLs por vírgula para criar um carousel que alterna a cada 5 segundos.
                  </p>
                  {form.trial_background_url && (
                    <BackgroundCarousel 
                      urls={form.trial_background_url.split(',').map(u => u.trim()).filter(u => u)}
                      onRemove={(index) => {
                        const urls = form.trial_background_url.split(',').map(u => u.trim()).filter(u => u);
                        urls.splice(index, 1);
                        const newValue = urls.join(', ');
                        handleChange('trial_background_url', newValue);
                        updateMany.mutateAsync({ ...form, trial_background_url: newValue });
                        toast.success('✅ Imagem removida!');
                      }}
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

                {/* Contato */}
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato / Home do APK</p>

                  <div className="space-y-2">
                    <Label>Frase de impacto (tela home do app)</Label>
                    <Textarea
                      value={form.impact_phrase}
                      onChange={e => handleChange("impact_phrase", e.target.value)}
                      placeholder="Ex: 🚀 O melhor streaming do Brasil!"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Exibida na tela inicial do app (campo <code>impact_phrase</code>).</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone / Contato (tela home)</Label>
                    <Input
                      value={form.contact_info}
                      onChange={e => handleChange("contact_info", e.target.value)}
                      placeholder="Ex: (11) 99999-9999 ou @seuperfil"
                    />
                    <p className="text-xs text-muted-foreground">Exibido na tela de contato do app (campo <code>contact</code>).</p>
                  </div>

                  <div className="space-y-2">
                    <Label>WhatsApp do suporte (número com DDI)</Label>
                    <Input
                      value={form.contact_whatsapp}
                      onChange={e => handleChange("contact_whatsapp", e.target.value)}
                      placeholder="Ex: 5511999999999"
                    />
                    <p className="text-xs text-muted-foreground">Usado no botão de WhatsApp do app (campo <code>str_whatsapp</code>).</p>
                  </div>

                  <div className="space-y-2">
                    <Label>URL do site</Label>
                    <Input
                      value={form.contact_website}
                      onChange={e => handleChange("contact_website", e.target.value)}
                      placeholder="Ex: https://ouropro.com.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Frase legal (tela de bloqueio / sobre o app)</Label>
                    <Textarea
                      value={form.legal_notice || ""}
                      onChange={e => handleChange("legal_notice", e.target.value)}
                      placeholder="OuroPro is a media player application. The app does not provide or include any media or content."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Exibida na tela de bloqueio e na página &quot;Sobre&quot; do app (campo <code>legal_notice</code>). Deixe vazio para usar o texto padrão.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Tela de Bloqueio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tela de Bloqueio / Expirado</CardTitle>
                <CardDescription>
                  Personalize o texto e botão exibidos quando o acesso do cliente está bloqueado ou expirado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold">Título da tela de bloqueio</Label>
                  <Input
                    value={form.lock_title}
                    onChange={e => handleChange("lock_title", e.target.value)}
                    placeholder="OuroPro"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Mensagem de bloqueio</Label>
                  <Textarea
                    value={form.lock_message}
                    onChange={e => handleChange("lock_message", e.target.value)}
                    rows={3}
                    placeholder="OuroPro is a media player application..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Texto do botão de renovação</Label>
                  <Input
                    value={form.lock_button_text}
                    onChange={e => handleChange("lock_button_text", e.target.value)}
                    placeholder="Renovar Agora"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">URL do botão de renovação (WhatsApp ou site)</Label>
                  <Input
                    value={form.lock_button_url}
                    onChange={e => handleChange("lock_button_url", e.target.value)}
                    placeholder="https://wa.me/5511999999999"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quando o cliente clicar em "Renovar Agora" na tela de bloqueio, será redirecionado para esta URL.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <p className="font-semibold">Como funciona:</p>
                  <p>Esses campos são enviados ao APK via <code>/api/guim.php</code> nos campos <code>lock_title</code>, <code>lock_message</code>, <code>lock_button_text</code> e <code>lock_button_url</code>. O APK exibe esses valores na tela de bloqueio quando o acesso expira.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Aba Tema ──────────────────────────────────────────────────── */}
          <TabsContent value="tema" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette size={16} /> Cor dos Botões
                </CardTitle>
                <CardDescription>
                  Escolha a cor principal dos botões do painel. A mudança é aplicada imediatamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Presets */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                    Cores Predefinidas
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleChange("primary_color", preset.value)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                          form.primary_color === preset.value
                            ? "border-foreground shadow-md scale-105"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full shadow-sm border border-black/10"
                          style={{ backgroundColor: preset.value }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor personalizada */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cor Personalizada (HEX)
                  </Label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={e => handleChange("primary_color", e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border border-input"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={e => handleChange("primary_color", e.target.value)}
                      placeholder="#D4AF37"
                      className="h-10 font-mono w-36"
                      maxLength={7}
                    />
                    <div
                      className="flex-1 h-10 rounded-md border flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: form.primary_color, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                    >
                      Prévia do Botão
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  A cor é aplicada imediatamente no painel e salva para ser restaurada no próximo acesso.
                </div>
              </CardContent>
            </Card>

            {/* Cor da Sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette size={16} /> Cor da Sidebar (Menu Lateral)
                </CardTitle>
                <CardDescription>
                  Personalize a cor de fundo do menu lateral. Deixe em branco para usar o padrão escuro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                    Cores Predefinidas
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {SIDEBAR_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleChange("sidebar_color", preset.value)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                          form.sidebar_color === preset.value
                            ? "border-foreground shadow-md scale-105"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full shadow-sm border border-white/20"
                          style={{ backgroundColor: preset.value }}
                        />
                        <span className="text-xs font-medium text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cor Personalizada (HEX)
                  </Label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={form.sidebar_color || "#1a1208"}
                      onChange={e => handleChange("sidebar_color", e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border border-input"
                    />
                    <Input
                      value={form.sidebar_color}
                      onChange={e => handleChange("sidebar_color", e.target.value)}
                      placeholder="#1a1208 (deixe vazio para padrão)"
                      className="h-10 font-mono"
                      maxLength={7}
                    />
                    {form.sidebar_color && (
                      <div
                        className="w-10 h-10 rounded-md border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: form.sidebar_color }}
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  A cor da sidebar é aplicada imediatamente. Recarregue a página após salvar para ver o efeito completo.
                </div>
              </CardContent>
            </Card>
            {/* Cor do Texto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette size={16} /> Cor do Texto (Letras)
                </CardTitle>
                <CardDescription>
                  Personalize a cor das letras/textos do painel. Deixe em branco para usar o padrão do tema.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                    Cores Predefinidas
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { name: "Branco", value: "#ffffff" },
                      { name: "Creme", value: "#fef9ee" },
                      { name: "Cinza Claro", value: "#e5e7eb" },
                      { name: "Dourado", value: "#D4AF37" },
                      { name: "Laranja", value: "#F97316" },
                      { name: "Azul Claro", value: "#93c5fd" },
                      { name: "Verde Claro", value: "#86efac" },
                      { name: "Padrão", value: "" },
                    ].map(preset => (
                      <button
                        key={preset.value || "default"}
                        type="button"
                        onClick={() => handleChange("text_color", preset.value)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                          form.text_color === preset.value
                            ? "border-foreground shadow-md scale-105"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full shadow-sm border border-black/10 flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: preset.value || "#374151", color: preset.value ? "#111" : "#fff" }}
                        >
                          Aa
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cor Personalizada (HEX)
                  </Label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={form.text_color || "#ffffff"}
                      onChange={e => handleChange("text_color", e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border border-input"
                    />
                    <Input
                      value={form.text_color}
                      onChange={e => handleChange("text_color", e.target.value)}
                      placeholder="Deixe vazio para padrão"
                      className="h-10 font-mono"
                      maxLength={7}
                    />
                    {form.text_color && (
                      <div
                        className="flex-1 h-10 rounded-md border flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: "#1a1208", color: form.text_color }}
                      >
                        Prévia do Texto
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  A cor do texto é aplicada imediatamente. Selecione "Padrão" para restaurar a cor original.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Aba Chatbot ───────────────────────────────────────────────── */}
          <TabsContent value="chatbot" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle size={16} /> Aviso Automático de Vencimento
                </CardTitle>
                <CardDescription>
                  Configure o chatbot para enviar mensagem automática via WhatsApp quando a assinatura de um cliente estiver prestes a vencer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                <div className="space-y-2">
                  <Label className="font-semibold">Dias antes do vencimento para avisar</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={form.chatbot_dias_aviso}
                    onChange={e => handleChange("chatbot_dias_aviso", e.target.value)}
                    placeholder="3"
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: 3 = envia mensagem 3 dias antes do vencimento.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Mensagem de aviso</Label>
                  <Textarea
                    value={form.chatbot_mensagem_vencimento}
                    onChange={e => handleChange("chatbot_mensagem_vencimento", e.target.value)}
                    rows={4}
                    placeholder="Olá {nome}! Sua assinatura vence em {dias} dia(s) ({data}). Renove agora!"
                  />
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold">Variáveis disponíveis:</p>
                    <p><code>{"{nome}"}</code> — Nome do servidor do cliente</p>
                    <p><code>{"{dias}"}</code> — Dias restantes até o vencimento</p>
                    <p><code>{"{data}"}</code> — Data de vencimento formatada (dd/mm/aaaa)</p>
                    <p><code>{"{mac}"}</code> — MAC do dispositivo</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold">Disparar manualmente agora</p>
                  <p className="text-xs text-muted-foreground">
                    Clique abaixo para enviar avisos imediatamente para todos os clientes que vencem nos próximos <strong>{form.chatbot_dias_aviso || 3} dia(s)</strong> e têm telefone cadastrado.
                  </p>
                  <Button
                    type="button"
                    onClick={handleTestChatbot}
                    disabled={sendingTest}
                    className="gap-2"
                  >
                    {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    Enviar Avisos Agora
                  </Button>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <strong>Como funciona:</strong> O sistema verifica automaticamente todos os dias os clientes com vencimento próximo e envia mensagem via WhatsApp para o número cadastrado no campo "Telefone" do cliente. Certifique-se de que os clientes tenham telefone cadastrado.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Aba APK ──────────────────────────────────────────────────── */}
          <TabsContent value="apk" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone size={16} /> Atualização Automática do APK
                </CardTitle>
                <CardDescription>
                  Configure o link de download do APK. Quando o cliente clicar em “Atualizar Aplicativo” no app, ele baixará automaticamente a versão cadastrada aqui.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                <div className="space-y-2">
                  <Label className="font-semibold">Link de download do APK</Label>
                  <Input
                    value={form.apk_download_url}
                    onChange={e => handleChange("apk_download_url", e.target.value)}
                    placeholder="https://exemplo.com/meuapp.apk"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL direta para o arquivo <code>.apk</code>. Pode ser um link do Google Drive, Dropbox, servidor próprio, etc.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Versão atual do APK</Label>
                  <Input
                    value={form.apk_version}
                    onChange={e => handleChange("apk_version", e.target.value)}
                    placeholder="Ex: 1.0.0"
                    className="w-40"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exibida no app para o usuário saber qual versão está disponível.
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
                  <p className="font-semibold">Como funciona:</p>
                  <p>1. Cole o link do APK acima e clique em <strong>Salvar Tudo</strong>.</p>
                  <p>2. O endpoint <code>/api/v4/update.php</code> passa a retornar esse link.</p>
                  <p>3. Quando o cliente clicar em <strong>Atualizar Aplicativo</strong> no app, ele consulta esse endpoint e baixa a nova versão automaticamente.</p>
                </div>

                {form.apk_download_url && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prévia do endpoint</p>
                    <div className="rounded bg-muted p-2">
                      <p className="text-xs font-mono break-all">
                        GET /api/v4/update.php → {JSON.stringify({ version: form.apk_version || "1.0.0", url: form.apk_download_url, force_update: false })}
                      </p>
                    </div>
                    <a
                      href={form.apk_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Smartphone size={12} /> Testar link do APK
                    </a>
                  </div>
                )}
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
