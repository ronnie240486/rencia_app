import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Image, Upload, LayoutGrid, Smartphone } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const DEFAULT_VALUES: Record<string, string> = {
  // Imagens
  gpcpro_banner_url: "",
  gpcpro_logo_url: "",
  gpcpro_background_url: "",
  // Contato
  gpcpro_contact_website: "",
  gpcpro_contact_whatsapp: "",
  gpcpro_impact_phrase: "",
  gpcpro_contact_info: "",
  // Tela de Bloqueio
  gpcpro_lock_title: "GPCPRO",
  gpcpro_lock_message: "GPCPRO is a media player application. The app does not provide or include any media or content.",
  gpcpro_lock_button_text: "Renovar Agora",
  gpcpro_lock_button_url: "",
  // APK
  gpcpro_apk_download_url: "",
  gpcpro_apk_version: "",
  // Frase legal
  gpcpro_legal_notice: "GPCPRO is a media player application. The app does not provide or include any media or content.",
  // Nome do app
  gpcpro_app_name: "GPCPRO",
  // Revendedor
  gpcpro_reseller_contact_name: "",
  gpcpro_reseller_whatsapp: "",
  gpcpro_reseller_email: "",
  // URL do servidor
  gpcpro_server_url: "",
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

export default function SettingsGpcpro() {
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
      toast.success("Configurações do GPCPRO salvas!");
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
          if (k.startsWith("gpcpro_") && v !== undefined && v !== null) {
            merged[k] = v;
          }
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
      <AdminLayout title="GPCPRO">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="GPCPRO">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personalize imagens, cores e configurações do aplicativo GPCPRO.
          </p>
          <Button onClick={handleSave} disabled={!dirty || updateMany.isPending} className="gap-2 btn-save">
            {updateMany.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Tudo
          </Button>
        </div>

        <div className="space-y-6">
          {/* ═══ SEÇÃO: Imagens (Banner + Logo + Fundo) ═══ */}
          <Card>
            <CardHeader>
              <CardTitle>GPCPRO — Imagens</CardTitle>
              <CardDescription>Personalize banner, logo e fundo do aplicativo GPCPRO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Banner */}
              <div className="space-y-2">
                <Label className="font-semibold">Banner do GPCPRO (320×180px)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.gpcpro_banner_url}
                    onChange={e => handleChange("gpcpro_banner_url", e.target.value)}
                    placeholder="https://exemplo.com/banner.png"
                  />
                  <UploadButton field="gpcpro_banner_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                </div>
                {form.gpcpro_banner_url && (
                  <img
                    src={form.gpcpro_banner_url}
                    alt="Preview banner GPCPRO"
                    className="mt-2 rounded border max-h-28 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="font-semibold">Logo do GPCPRO</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.gpcpro_logo_url}
                    onChange={e => handleChange("gpcpro_logo_url", e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <UploadButton field="gpcpro_logo_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                </div>
                {form.gpcpro_logo_url && (
                  <img
                    src={form.gpcpro_logo_url}
                    alt="Preview logo GPCPRO"
                    className="mt-2 rounded border max-h-16 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              {/* Fundo */}
              <div className="space-y-2">
                <Label className="font-semibold">Imagem de fundo (960×540px)</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.gpcpro_background_url}
                    onChange={e => handleChange("gpcpro_background_url", e.target.value)}
                    placeholder="https://exemplo.com/background.png"
                  />
                  <UploadButton field="gpcpro_background_url" uploadingField={uploadingField} onUpload={handleFileUpload} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Servida via <code>/api/v5/bg_roku</code> — o APK buscará ao reiniciar.
                </p>
                {form.gpcpro_background_url && (
                  <img
                    src={form.gpcpro_background_url}
                    alt="Preview fundo GPCPRO"
                    className="mt-2 rounded border max-h-32 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ SEÇÃO: Contato ═══ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato / Home do GPCPRO</CardTitle>
              <CardDescription>Configure as informações de contato exibidas no app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label>Frase de impacto (tela home)</Label>
                <Textarea
                  value={form.gpcpro_impact_phrase}
                  onChange={e => handleChange("gpcpro_impact_phrase", e.target.value)}
                  placeholder="Ex: O melhor streaming do Brasil!"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone / Contato</Label>
                <Input
                  value={form.gpcpro_contact_info}
                  onChange={e => handleChange("gpcpro_contact_info", e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp do suporte (número com DDI)</Label>
                <Input
                  value={form.gpcpro_contact_whatsapp}
                  onChange={e => handleChange("gpcpro_contact_whatsapp", e.target.value)}
                  placeholder="Ex: 5511999999999"
                />
              </div>

              <div className="space-y-2">
                <Label>URL do site</Label>
                <Input
                  value={form.gpcpro_contact_website}
                  onChange={e => handleChange("gpcpro_contact_website", e.target.value)}
                  placeholder="Ex: https://seusite.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Frase legal (tela de bloqueio / sobre)</Label>
                <Textarea
                  value={form.gpcpro_legal_notice || ""}
                  onChange={e => handleChange("gpcpro_legal_notice", e.target.value)}
                  placeholder="GPCPRO is a media player application..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* ═══ SEÇÃO: Revendedor ═══ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Revendedor</CardTitle>
              <CardDescription>Dados exibidos no endpoint /api/v5/reseller_contact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label className="font-semibold">Nome do Revendedor</Label>
                <Input
                  value={form.gpcpro_reseller_contact_name}
                  onChange={e => handleChange("gpcpro_reseller_contact_name", e.target.value)}
                  placeholder="Ex: Seu Nome ou Nome da Empresa"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">WhatsApp do Revendedor</Label>
                <Input
                  value={form.gpcpro_reseller_whatsapp}
                  onChange={e => handleChange("gpcpro_reseller_whatsapp", e.target.value)}
                  placeholder="Ex: 5511999999999"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Email do Revendedor</Label>
                <Input
                  value={form.gpcpro_reseller_email}
                  onChange={e => handleChange("gpcpro_reseller_email", e.target.value)}
                  placeholder="Ex: contato@seusite.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">URL do Servidor (DNS)</Label>
                <Input
                  value={form.gpcpro_server_url}
                  onChange={e => handleChange("gpcpro_server_url", e.target.value)}
                  placeholder="Ex: https://renciaapp.manus.space"
                />
                <p className="text-xs text-muted-foreground">
                  URL do servidor que o GPCPRO usará como referência de DNS.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ═══ SEÇÃO: Tela de Bloqueio ═══ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tela de Bloqueio / Expirado</CardTitle>
              <CardDescription>Personalize o texto exibido quando o acesso do cliente está bloqueado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold">Título da tela de bloqueio</Label>
                <Input
                  value={form.gpcpro_lock_title}
                  onChange={e => handleChange("gpcpro_lock_title", e.target.value)}
                  placeholder="GPCPRO"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Mensagem de bloqueio</Label>
                <Textarea
                  value={form.gpcpro_lock_message}
                  onChange={e => handleChange("gpcpro_lock_message", e.target.value)}
                  rows={3}
                  placeholder="GPCPRO is a media player application..."
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Texto do botão de renovação</Label>
                <Input
                  value={form.gpcpro_lock_button_text}
                  onChange={e => handleChange("gpcpro_lock_button_text", e.target.value)}
                  placeholder="Renovar Agora"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">URL do botão de renovação</Label>
                <Input
                  value={form.gpcpro_lock_button_url}
                  onChange={e => handleChange("gpcpro_lock_button_url", e.target.value)}
                  placeholder="https://wa.me/5511999999999"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Nome do App</Label>
                <Input
                  value={form.gpcpro_app_name}
                  onChange={e => handleChange("gpcpro_app_name", e.target.value)}
                  placeholder="GPCPRO"
                />
              </div>
            </CardContent>
          </Card>

          {/* ═══ SEÇÃO: APK ═══ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone size={16} /> Configurações do APK GPCPRO
              </CardTitle>
              <CardDescription>Gerencie versões e links de download do APK GPCPRO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold">URL de Download do APK GPCPRO</Label>
                <Input
                  value={form.gpcpro_apk_download_url}
                  onChange={e => handleChange("gpcpro_apk_download_url", e.target.value)}
                  placeholder="https://exemplo.com/gpcpro.apk"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Versão Atual do APK GPCPRO</Label>
                <Input
                  value={form.gpcpro_apk_version}
                  onChange={e => handleChange("gpcpro_apk_version", e.target.value)}
                  placeholder="1.0.0"
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <p className="font-semibold">Endpoints GPCPRO (v5):</p>
                <p><code>/api/v5/check_mac.php</code> — Verificar e autenticar MAC</p>
                <p><code>/api/v5/mac_exists</code> — Verificar se MAC está cadastrado</p>
                <p><code>/api/v5/check_expire.php</code> — Verificar expiração</p>
                <p><code>/api/v5/getdns_list</code> — Listar DNS/servidores</p>
                <p><code>/api/v5/get_playlist_roku</code> — Obter playlist do dispositivo</p>
                <p><code>/api/v5/logo_roku</code> — Logo do app</p>
                <p><code>/api/v5/bg_roku</code> — Imagem de fundo</p>
                <p><code>/api/v5/roku_banners</code> — Banners da interface</p>
                <p><code>/api/v5/reseller_contact</code> — Contato do revendedor</p>
                <p><code>/api/v5/user_register</code> — Registrar novo dispositivo</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}
