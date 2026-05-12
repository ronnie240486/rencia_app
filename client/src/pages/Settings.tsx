import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Image, Upload, Palette, MessageCircle, Smartphone } from "lucide-react";
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
  // Chatbot
  chatbot_dias_aviso: "3",
  chatbot_mensagem_vencimento: "Olá {nome}! Sua assinatura vence em {dias} dia(s) ({data}). Renove agora para não perder o acesso! 😊",
  // APK
  apk_download_url: "",
  apk_version: "",
};

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
          <TabsList className="grid grid-cols-4 w-full">
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

                {/* Contato */}
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato / Home do APK</p>
                  <div className="space-y-2">
                    <Label>Frase de impacto (tela home)</Label>
                    <Textarea
                      value={form.impact_phrase}
                      onChange={e => handleChange("impact_phrase", e.target.value)}
                      placeholder="Ex: 🚀 O melhor IPTV do Brasil!"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contato (tela home)</Label>
                    <Input
                      value={form.contact_info}
                      onChange={e => handleChange("contact_info", e.target.value)}
                      placeholder="Ex: WhatsApp: (11) 99999-9999"
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
                  <div className="space-y-2">
                    <Label>URL do site</Label>
                    <Input
                      value={form.contact_website}
                      onChange={e => handleChange("contact_website", e.target.value)}
                      placeholder="Ex: https://ourorevenda.com"
                    />
                  </div>
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
