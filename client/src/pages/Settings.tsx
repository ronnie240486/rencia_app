import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Smartphone, Image, Upload, RefreshCw, MessageCircle, Send, EyeOff, Palette } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  trial_title: "Acesso Bloqueado",
  trial_subtitle: "🚀 Assine agora e tenha acesso ilimitado a canais, filmes e séries!",
  trial_support_text: "Suporte com seu revendedor",
  trial_banner_url: "",
  trial_logo_url: "",
  trial_logo_hidden: "false",
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
  icon_reload_url: "",
  icon_exit_url: "",
  icon_settings_url: "",
  app_version: "",
  app_download_url: "",
  sidebar_logo_url: "",
  primary_color: "#D4AF37",
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
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="trial" className="gap-1 text-xs">
              <Smartphone size={13} /> Bloqueio
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1 text-xs">
              <Image size={13} /> Imagens
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-1 text-xs">
              <RefreshCw size={13} /> Atualização
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1 text-xs">
              <Palette size={12} /> Tema
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <MessageCircle size={13} /> Chatbot
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
                    placeholder="Ex: https://renciaapp-ldyffp73.manus.space"
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
                  <div className="flex items-center justify-between">
                    <Label>Logo do APK (home_logo)</Label>
                    <button
                      type="button"
                      onClick={() => handleChange("trial_logo_hidden", form.trial_logo_hidden === "true" ? "false" : "true")}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${form.trial_logo_hidden === "true" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border text-muted-foreground"}`}
                      title="Ocultar logo no APK"
                    >
                      <EyeOff size={12} />
                      {form.trial_logo_hidden === "true" ? "Logo oculto" : "Ocultar logo"}
                    </button>
                  </div>
                  {form.trial_logo_hidden === "true" && (
                    <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <EyeOff size={12} /> O logo está oculto no APK. Clique em "Ocultar logo" novamente para reativar.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={form.trial_logo_url}
                      onChange={e => handleChange("trial_logo_url", e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      disabled={form.trial_logo_hidden === "true"}
                    />
                    <UploadButton field="trial_logo_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  {form.trial_logo_url && form.trial_logo_hidden !== "true" && (
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
                  <Image size={16} /> Logo do Painel (Sidebar)
                </CardTitle>
                <CardDescription>
                  Logo exibido na barra lateral do painel OuroPro. Recomendado: PNG transparente, 200×64px.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>URL do Logo do Painel</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.sidebar_logo_url ?? ""}
                      onChange={e => handleChange("sidebar_logo_url", e.target.value)}
                      placeholder="https://exemplo.com/logo-painel.png"
                    />
                    <UploadButton field="sidebar_logo_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                  </div>
                  {form.sidebar_logo_url && (
                    <img
                      src={form.sidebar_logo_url}
                      alt="Preview logo painel"
                      className="mt-2 rounded border max-h-16 object-contain bg-sidebar p-2"
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Deixe em branco para exibir o texto <strong>OuroPro</strong> como logo.</p>
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
                  Os ícones são servidos sem fundo escuro — use imagens PNG com fundo transparente.
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
                    { key: "icon_reload_url", label: "Reload", hint: "Ícone de reload — 70×70px" },
                    { key: "icon_exit_url", label: "Exit / Sair", hint: "Ícone de saída — 70×70px" },
                    { key: "icon_settings_url", label: "Configurações", hint: "Ícone de config — 70×70px" },
                  ] as { key: string; label: string; hint: string }[]).map(({ key, label, hint }) => (
                    <div key={key} className="space-y-2">
                      <Label className="font-medium">{label}</Label>
                      <div className="flex gap-2 items-center">
                        {form[key] ? (
                          <img src={form[key]} alt={label} className="w-14 h-14 rounded border object-contain" onError={e => (e.currentTarget.style.display = "none")} />
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
          </TabsContent>

          {/* Atualização do App */}
          <TabsContent value="update" className="space-y-4 mt-4">
            <AppUpdateTab form={form} handleChange={handleChange} handleSave={handleSave} updateMany={updateMany} dirty={dirty} />
          </TabsContent>

          {/* Chatbot WhatsApp */}
          <TabsContent value="theme" className="space-y-4 mt-4">
            <ThemeColorTab form={form} handleChange={handleChange} />
          </TabsContent>
          <TabsContent value="chat" className="space-y-4 mt-4">
            <ChatbotTab />
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

// ─── Aba: Atualização do App ─────────────────────────────────────────────────
function AppUpdateTab({ form, handleChange, handleSave, updateMany, dirty }: {
  form: Record<string, string>;
  handleChange: (k: string, v: string) => void;
  handleSave: () => void;
  updateMany: { isPending: boolean };
  dirty: boolean;
}) {
  const bumpVersion = () => {
    const cur = form.app_version || "1.0.0";
    const parts = cur.split(".").map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    handleChange("app_version", parts.join("."));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw size={16} /> Atualização do Aplicativo
        </CardTitle>
        <CardDescription>
          Configure a versão atual e o link de download. O APK verifica esta versão ao conectar e exibe notificação de atualização se houver versão nova.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Versão atual do APK</Label>
          <div className="flex gap-2">
            <Input
              value={form.app_version}
              onChange={e => handleChange("app_version", e.target.value)}
              placeholder="Ex: 5.0.0"
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={bumpVersion} title="Incrementar versão patch (+0.0.1)">
              +1
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Quando o APK conectar e detectar versão diferente, exibirá notificação de atualização disponível.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Link de download do novo APK</Label>
          <Input
            value={form.app_download_url}
            onChange={e => handleChange("app_download_url", e.target.value)}
            placeholder="https://exemplo.com/ouroproplayer.apk"
          />
          <p className="text-xs text-muted-foreground">
            URL do APK mais recente. O APK abrirá este link quando o usuário clicar em "Atualizar".
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={!dirty || updateMany.isPending}
          className="w-full gap-2"
        >
          {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar e Publicar Atualização
        </Button>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          <strong>Como funciona:</strong> O endpoint <code>/api/v4/version.php</code> retorna a versão configurada aqui. O APK compara com sua versão interna e, se diferente, exibe um alerta para o usuário baixar a atualização pelo link acima.
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Aba: Chatbot WhatsApp ───────────────────────────────────────────────────
function ChatbotTab() {
  const { data: clients, isLoading } = trpc.chatbot.clients.useQuery();
  const [selectedMac, setSelectedMac] = useState("");
  const [message, setMessage] = useState("");

  const selectedClient = clients?.find(c => c.mac === selectedMac);

  const sendWhatsApp = () => {
    if (!message.trim()) { toast.error("Digite uma mensagem."); return; }
    if (!selectedClient) { toast.error("Selecione um cliente."); return; }

    const phone = selectedClient.ownerTelefone || "";
    if (!phone) {
      toast.error("Este cliente não tem telefone cadastrado. Edite o device e adicione o telefone.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("WhatsApp aberto! Envie a mensagem pelo app.");
  };

  const quickMessages = [
    "Olá! Seu acesso ao OuroPro está ativo. Qualquer dúvida estou à disposição! 😊",
    "Atenção: seu plano vence em breve. Renove agora para não perder o acesso!",
    "Seu acesso foi renovado com sucesso! Aproveite o OuroPro! 🎉",
    "Olá! Identificamos um problema no seu acesso. Entre em contato para resolvermos.",
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle size={16} /> Enviar Mensagem WhatsApp
          </CardTitle>
          <CardDescription>
            Selecione um cliente e envie uma mensagem diretamente pelo WhatsApp. O cliente precisa ter telefone cadastrado no formulário de cadastro do device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar cliente</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 size={14} className="animate-spin" /> Carregando clientes...</div>
            ) : (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedMac}
                onChange={e => setSelectedMac(e.target.value)}
              >
                <option value="">-- Selecione um cliente --</option>
                {clients?.map(c => (
                  <option key={c.deviceId} value={c.mac}>
                    {c.nomeServer} ({c.mac}) {c.ownerTelefone ? "📱" : "⚠️ sem tel"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedClient && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Cliente:</strong> {selectedClient.nomeServer}</p>
              <p><strong>MAC:</strong> {selectedClient.mac}</p>
              <p><strong>Telefone:</strong> {selectedClient.ownerTelefone || <span className="text-destructive">Não cadastrado — edite o device e adicione o telefone</span>}</p>
              <p><strong>Status:</strong> {selectedClient.status}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Mensagens rápidas</Label>
            <div className="grid grid-cols-1 gap-2">
              {quickMessages.map((msg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMessage(msg)}
                  className="text-left text-xs px-3 py-2 rounded-md border border-dashed hover:bg-muted transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={sendWhatsApp}
            disabled={!selectedMac || !message.trim()}
            className="w-full gap-2"
          >
            <Send size={16} />
            Enviar via WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Aba: Tema / Paleta de Cores ─────────────────────────────────────────────
const PRESET_COLORS = [
  { name: "Dourado", value: "#D4AF37" },
  { name: "Ouro Velho", value: "#B8860B" },
  { name: "Âmbar", value: "#F59E0B" },
  { name: "Laranja", value: "#F97316" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Ciano", value: "#06B6D4" },
  { name: "Verde", value: "#10B981" },
  { name: "Lima", value: "#84CC16" },
  { name: "Branco", value: "#F8FAFC" },
];

function hexToOklch(hex: string): string {
  // Simple conversion for CSS custom property — use oklch approximation
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const lightness = Math.round(l * 100) / 100;
  return `${(lightness * 0.8 + 0.2).toFixed(2)} 0.15 ${Math.round(Math.atan2(b - g, r - b) * 180 / Math.PI + 180)}`;
}

function ThemeColorTab({ form, handleChange }: { form: Record<string, string>; handleChange: (k: string, v: string) => void }) {
  const currentColor = form.primary_color || "#D4AF37";

  const applyColor = (hex: string) => {
    handleChange("primary_color", hex);
    // Apply immediately to CSS variables for live preview
    const oklch = hexToOklch(hex);
    document.documentElement.style.setProperty("--primary", oklch);
    // Compute foreground: dark text on light colors, light on dark
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const fgOklch = luminance > 0.5 ? "0.15 0 0" : "0.98 0 0";
    document.documentElement.style.setProperty("--primary-foreground", fgOklch);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette size={16} /> Cor Principal dos Botões
          </CardTitle>
          <CardDescription>
            Escolha a cor dos botões, links e elementos de destaque do painel. A mudança é aplicada em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Paleta de presets */}
          <div className="space-y-2">
            <Label>Paleta de Cores</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  title={name}
                  onClick={() => applyColor(value)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${currentColor.toLowerCase() === value.toLowerCase() ? "border-foreground scale-110 shadow-lg" : "border-transparent"}`}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {PRESET_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyColor(value)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${currentColor.toLowerCase() === value.toLowerCase() ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Cor personalizada */}
          <div className="space-y-2">
            <Label>Cor Personalizada (HEX)</Label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={currentColor}
                onChange={e => applyColor(e.target.value)}
                className="w-12 h-10 rounded-md border cursor-pointer"
              />
              <Input
                value={currentColor}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) applyColor(v);
                }}
                placeholder="#D4AF37"
                className="font-mono w-36"
                maxLength={7}
              />
              <div
                className="flex-1 h-10 rounded-md border"
                style={{ backgroundColor: currentColor }}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: currentColor }}
              >
                Botão Principal
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium border"
                style={{ borderColor: currentColor, color: currentColor }}
              >
                Botão Outline
              </button>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: currentColor }}
              >
                Badge
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A cor é salva nas configurações e aplicada automaticamente ao painel. Clique em <strong>Salvar Alterações</strong> para persistir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
