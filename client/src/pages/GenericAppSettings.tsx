import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { isManagedAppId, MANAGED_APP_CATALOG, NEW_MANAGED_APP_IDS } from "@shared/appCatalog";
import { ExternalLink, Image as ImageIcon, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

const visualFields = [
  ["banner_url", "Banner", "320×180px"],
  ["logo_url", "Logo", "quadrado"],
  ["background_url", "Imagem de fundo", "960×540px"],
  ["message_image_url", "Imagem de mensagem", "opcional"],
  ["icon_live_tv_url", "Ícone de Canais", "opcional"],
  ["icon_movies_url", "Ícone de Filmes", "opcional"],
  ["icon_series_url", "Ícone de Séries", "opcional"],
] as const;

function defaultsFor(appId: string, name: string, defaultLogoUrl: string): Record<string, string> {
  const p = `${appId}_`;
  return {
    [`${p}app_name`]: name, [`${p}impact_phrase`]: "", [`${p}message_title`]: "", [`${p}message_text`]: "",
    [`${p}block_title`]: `${name} - Acesso bloqueado`, [`${p}block_message`]: "Seu acesso está bloqueado ou expirado. Entre em contato com seu revendedor.",
    [`${p}renew_button_text`]: "Renovar agora", [`${p}renew_button_url`]: "", [`${p}server_api_url`]: "", [`${p}reseller_email`]: "",
    [`${p}apk_download_url`]: "", [`${p}apk_version`]: "", [`${p}auto_play_last_channel`]: "true", [`${p}auto_rotate`]: "false",
    [`${p}current_plan`]: "Premium", [`${p}quality`]: "1080p", [`${p}subtitles`]: "Português", [`${p}audio_track`]: "Português",
    [`${p}image_ratio`]: "16:9", [`${p}buffer_size`]: "Médio", [`${p}retry_attempts`]: "3", [`${p}show_most_watched`]: "true",
    [`${p}show_recently_watched`]: "true", [`${p}language`]: "pt-BR", [`${p}contact_email`]: "",
    ...Object.fromEntries(visualFields.map(([visualField]) => [`${p}${visualField}`, visualField === "logo_url" ? defaultLogoUrl : ""])),
  };
}

function UploadButton({ field, busy, onFile }: { field: string; busy: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <><input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }} /><Button type="button" size="icon" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy} title="Enviar imagem">{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}</Button></>;
}

export default function GenericAppSettings() {
  const { appId = "" } = useParams<{ appId: string }>();
  const app = isManagedAppId(appId) && NEW_MANAGED_APP_IDS.includes(appId) ? MANAGED_APP_CATALOG[appId] : null;
  const { data: allSettings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const [form, setForm] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const save = trpc.settings.updateMany.useMutation({ onSuccess: () => { toast.success("Configurações salvas!"); setDirty(false); refetch(); }, onError: (error) => toast.error(error.message) });

  useEffect(() => {
    if (!app || !allSettings || initialized) return;
    const values = defaultsFor(app.id, app.displayName, app.defaultLogoUrl);
    Object.keys(values).forEach((key) => { if (allSettings[key] !== undefined && allSettings[key] !== null) values[key] = String(allSettings[key]); });
    setForm(values); setInitialized(true);
  }, [app, allSettings, initialized]);

  if (!app) return <AdminLayout title="Aplicativo"><div className="p-6 text-muted-foreground">Aplicativo não encontrado.</div></AdminLayout>;
  const p = `${app.id}_`;
  const field = (key: string) => `${p}${key}`;
  const change = (key: string, value: string) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const toggle = (key: string, checked: boolean) => change(key, checked ? "true" : "false");
  const isOn = (key: string) => form[key] === "true";
  const displayLogo = form[field("logo_url")] || app.defaultLogoUrl;
  const uploadImage = async (key: string, file: File) => {
    try { setUploading(key); const body = new FormData(); body.append("image", file); body.append("field", key); const response = await fetch("/api/upload-image", { method: "POST", body, credentials: "include" }); if (!response.ok) throw new Error("Não foi possível enviar a imagem."); const { url } = await response.json() as { url: string }; const values = { ...form, [key]: url }; setForm(values); await save.mutateAsync(values); toast.success("Imagem enviada e salva!"); } catch (error: any) { toast.error(error.message || "Erro no upload."); } finally { setUploading(null); }
  };
  const selection = (label: string, key: string, values: string[]) => <div className="space-y-2"><Label>{label}</Label><Select value={form[field(key)] || values[0]} onValueChange={(value) => change(field(key), value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{values.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>;
  const textInput = (label: string, key: string, type = "text", placeholder = "") => <div className="space-y-2"><Label>{label}</Label><Input type={type} value={form[field(key)] || ""} onChange={(e) => change(field(key), e.target.value)} placeholder={placeholder} /></div>;

  return <AdminLayout title={app.displayName}><div className="mx-auto max-w-5xl space-y-6 p-1 sm:p-3">
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 p-1">{displayLogo ? <img src={displayLogo} alt={app.displayName} className="h-full w-full rounded-xl object-contain" /> : <ImageIcon className="text-muted-foreground" size={28} />}</div><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Aplicativo personalizado</p><h1 className="mt-1 text-3xl font-black">{app.displayName}</h1><p className="mt-1 text-sm text-muted-foreground">A mesma estrutura completa de personalização do Maximus Player.</p></div></div><Button onClick={() => save.mutate(form)} disabled={!dirty || save.isPending || isLoading} className="gap-2 btn-save">{save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar tudo</Button></div>

    <Card><CardHeader><CardTitle>{app.displayName} — Imagens</CardTitle><CardDescription>Personalize banner, logo, fundo, avisos e os ícones mostrados no aplicativo.</CardDescription></CardHeader><CardContent className="grid gap-6 md:grid-cols-2">{visualFields.map(([key, label, hint]) => { const full = field(key); const url = form[full]; return <div key={key} className="space-y-2"><Label>{label} <span className="text-muted-foreground">({hint})</span></Label><div className="flex gap-2"><Input value={url || ""} onChange={(e) => change(full, e.target.value)} placeholder="https://..." /><UploadButton field={full} busy={uploading === full} onFile={(file) => uploadImage(full, file)} /></div><div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/30">{url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <ImageIcon className="text-muted-foreground" size={24} />}</div></div>; })}</CardContent></Card>

    <Card><CardHeader><CardTitle>Tela de Bloqueio / Expirado</CardTitle><CardDescription>Defina o texto e o botão que aparecem quando o cliente estiver bloqueado ou vencido.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{textInput("Título da tela de bloqueio", "block_title")}<div className="space-y-2"><Label>Mensagem de bloqueio</Label><Textarea value={form[field("block_message")] || ""} onChange={(e) => change(field("block_message"), e.target.value)} /></div>{textInput("Texto do botão de renovação", "renew_button_text")} {textInput("URL do botão de renovação", "renew_button_url", "url", "https://...")}</CardContent></Card>

    <Card><CardHeader><CardTitle>Configurações Gerais</CardTitle><CardDescription>Comportamento inicial e plano exibido no aplicativo.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><div className="flex items-center justify-between rounded-lg border p-3"><Label>Reproduzir último canal automaticamente</Label><Switch checked={isOn(field("auto_play_last_channel"))} onCheckedChange={(checked) => toggle(field("auto_play_last_channel"), checked)} /></div><div className="flex items-center justify-between rounded-lg border p-3"><Label>Rotação automática</Label><Switch checked={isOn(field("auto_rotate"))} onCheckedChange={(checked) => toggle(field("auto_rotate"), checked)} /></div>{selection("Plano atual", "current_plan", ["Gratuito", "Premium", "Pro"])}</CardContent></Card>

    <Card><CardHeader><CardTitle>Configurações do Reprodutor</CardTitle><CardDescription>Qualidade, legenda, áudio, imagem, buffer e tentativas de reprodução.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{selection("Qualidade de vídeo", "quality", ["480p", "720p", "1080p", "4K"])}{selection("Legendas", "subtitles", ["Desativado", "Português", "Inglês", "Espanhol"])}{selection("Faixa de áudio", "audio_track", ["Português", "Inglês", "Espanhol"])}{selection("Proporção da imagem", "image_ratio", ["Preenchimento", "Ajuste", "Esticamento", "16:9", "4:3"])}{selection("Tamanho do buffer", "buffer_size", ["Pequeno", "Médio", "Grande"])}{textInput("Tentar novamente (1 a 10)", "retry_attempts", "number")}</CardContent></Card>

    <Card><CardHeader><CardTitle>Conteúdo Assistido</CardTitle><CardDescription>Defina quais seções de histórico serão visíveis no aplicativo.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><div className="flex items-center justify-between rounded-lg border p-3"><Label>Mostrar mais assistidos</Label><Switch checked={isOn(field("show_most_watched"))} onCheckedChange={(checked) => toggle(field("show_most_watched"), checked)} /></div><div className="flex items-center justify-between rounded-lg border p-3"><Label>Mostrar recentemente visto</Label><Switch checked={isOn(field("show_recently_watched"))} onCheckedChange={(checked) => toggle(field("show_recently_watched"), checked)} /></div><div className="md:col-span-2 space-y-2"><Label>Frase de impacto</Label><Textarea value={form[field("impact_phrase")] || ""} onChange={(e) => change(field("impact_phrase"), e.target.value)} /></div></CardContent></Card>

    <Card><CardHeader><CardTitle>Mensagens, API e Renovação</CardTitle><CardDescription>Integração com o painel, comunicação e contato do revendedor.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Título da mensagem</Label><Input value={form[field("message_title")] || ""} onChange={(e) => change(field("message_title"), e.target.value)} /></div>{textInput("API do Servidor", "server_api_url", "url", "https://...")}{textInput("Email do revendedor", "reseller_email", "email")}<div className="space-y-2"><Label>Mensagem do aplicativo</Label><Textarea value={form[field("message_text")] || ""} onChange={(e) => change(field("message_text"), e.target.value)} /></div></CardContent></Card>

    <Card><CardHeader><CardTitle>Atualização do {app.displayName}</CardTitle><CardDescription>URL exclusiva de atualização usada somente por este aplicativo.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{textInput("URL de atualização do APK", "apk_download_url", "url", "https://...apk")}{textInput("Versão do APK", "apk_version", "text", "Ex.: 1.0.0")}</CardContent></Card>

    <Card><CardHeader><CardTitle>Integração por MAC e listas</CardTitle><CardDescription>O APK recebe o visual, as listas ativas e os recursos desta página pelo MAC cadastrado.</CardDescription></CardHeader><CardContent className="space-y-3"><code className="block break-all rounded bg-muted p-3 text-xs">GET /api/v5/apps/{app.id}/config?mac={'{MAC}'}</code><code className="block break-all rounded bg-muted p-3 text-xs">GET /api/v5/apps/{app.id}/update?mac={'{MAC}'}</code><p className="text-sm text-muted-foreground">As listas são cadastradas no cliente. Quando a Lista 1 falhar, o aplicativo deve consultar os avisos do painel, recarregar a playlist em segundo plano e manter a reprodução ativa.</p><a href="/device-lists" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ExternalLink size={15} /> Gerenciar listas de clientes</a></CardContent></Card>
    <Button onClick={() => save.mutate(form)} disabled={!dirty || save.isPending || isLoading} className="w-full gap-2 btn-save">{save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar todas as configurações</Button>
  </div></AdminLayout>;
}
