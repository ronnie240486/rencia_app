import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Upload, Palette, MessageCircle, Smartphone } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  // Tema
  primary_color: "#D4AF37",
  sidebar_color: "",
  text_color: "",
  // Contato
  contact_website: "",
  contact_whatsapp: "",
  impact_phrase: "",
  contact_info: "",
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

export default function SettingsPainel() {
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const [sendingTest, setSendingTest] = useState(false);
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
      <AdminLayout title="Configurações do Painel">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout title="Configurações do Painel">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personalize cores, tema, chatbot e APK do seu painel.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2 btn-save">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>
        <Tabs defaultValue="painel">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="painel" className="gap-1 text-xs">
              🎨 Painel
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
          <TabsContent value="painel" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🎨 Cores dos Botões do Painel</CardTitle>
                <CardDescription>
                  Personalize as cores de todos os botões. As cores são salvas e aplicadas automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "panel_search_button_color", label: "Botão Busca (Lupa)" },
                  { key: "panel_add_user_color", label: "Botão Cadastrar Novo Usuário" },
                  { key: "panel_add_user_bottom_color", label: "Botão Cadastrar Usuário (Rodapé)" },
                  { key: "panel_new_resale_color", label: "Botão Nova Revenda" },
                  { key: "panel_active_color", label: "Botão Ativos (Filtro)" },
                  { key: "panel_all_color", label: "Botão Todos (Filtro)" },
                  { key: "panel_selected_color", label: "Botão Selecionado (Ativo)" },
                  { key: "panel_save_color", label: "Botões Salvar / Confirmar" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{label}</Label>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form[key] || "#EF4444"}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        type="text"
                        value={form[key] || "#EF4444"}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-28 text-xs"
                        placeholder="#EF4444"
                      />
                      <div
                        className="px-3 py-1 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: form[key] || "#EF4444" }}
                      >
                        Preview
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

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
