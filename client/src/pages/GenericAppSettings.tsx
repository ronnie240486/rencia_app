import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { isManagedAppId, MANAGED_APP_CATALOG, NEW_MANAGED_APP_IDS } from "@shared/appCatalog";
import { Loader2, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

const assetSuffixes = ["logo_url", "banner_url", "background_url", "message_image_url", "icon_live_tv_url", "icon_movies_url", "icon_series_url"] as const;
const assetLabels: Record<(typeof assetSuffixes)[number], string> = {
  logo_url: "Logo / ícone",
  banner_url: "Banner",
  background_url: "Imagem de fundo",
  message_image_url: "Imagem de mensagem",
  icon_live_tv_url: "Ícone de Canais",
  icon_movies_url: "Ícone de Filmes",
  icon_series_url: "Ícone de Séries",
};

function makeDefaults(appId: string, appName: string): Record<string, string> {
  const prefix = `${appId}_`;
  return {
    [`${prefix}app_name`]: appName,
    [`${prefix}impact_phrase`]: "",
    [`${prefix}message_title`]: "",
    [`${prefix}message_text`]: "",
    [`${prefix}server_api_url`]: "",
    [`${prefix}apk_download_url`]: "",
    [`${prefix}apk_version`]: "",
    ...Object.fromEntries(assetSuffixes.map((suffix) => [`${prefix}${suffix}`, ""])),
  };
}

function AssetUpload({ field, busy, onUpload }: { field: string; busy: boolean; onUpload: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return <><input ref={ref} className="hidden" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} /><Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => ref.current?.click()} title="Enviar imagem">{busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}</Button></>;
}

export default function GenericAppSettings() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId || "";
  const app = isManagedAppId(appId) && NEW_MANAGED_APP_IDS.includes(appId) ? MANAGED_APP_CATALOG[appId] : null;
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const [form, setForm] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const save = trpc.settings.updateMany.useMutation({ onSuccess: () => { toast.success("Configurações salvas!"); setDirty(false); refetch(); }, onError: (error) => toast.error(error.message) });

  useEffect(() => {
    if (!app || !settings || ready) return;
    const next = makeDefaults(app.id, app.displayName);
    Object.keys(next).forEach((key) => { if (settings[key] != null) next[key] = String(settings[key]); });
    setForm(next);
    setReady(true);
  }, [app, ready, settings]);

  if (!app) return <AdminLayout title="Aplicativo"><div className="p-6 text-muted-foreground">Aplicativo não encontrado.</div></AdminLayout>;
  const prefix = `${app.id}_`;
  const update = (key: string, value: string) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  const upload = async (field: string, file: File) => {
    try {
      setUploading(field);
      const body = new FormData();
      body.append("image", file);
      body.append("field", field);
      const response = await fetch("/api/upload-image", { method: "POST", body, credentials: "include" });
      if (!response.ok) throw new Error("Não foi possível enviar a imagem.");
      const { url } = await response.json() as { url: string };
      const next = { ...form, [field]: url };
      setForm(next);
      await save.mutateAsync(next);
      toast.success("Imagem enviada e salva!");
    } catch (error: any) { toast.error(error.message || "Erro no upload."); } finally { setUploading(null); }
  };

  return <AdminLayout title={app.displayName}>
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">{app.displayName}</h1><p className="text-sm text-muted-foreground">Personalize imagens, mensagens, listas, integração por MAC e atualização deste aplicativo.</p></div><Button className="gap-2 btn-save" onClick={() => save.mutate(form)} disabled={!dirty || save.isPending}>{save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar alterações</Button></div>
      <Card><CardHeader><CardTitle>Imagens e ícones</CardTitle><CardDescription>Use upload para logo, banner, fundo, avisos e os ícones do conteúdo.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">{assetSuffixes.map((suffix) => { const field = `${prefix}${suffix}`; return <div key={field} className="space-y-2"><Label>{assetLabels[suffix]}</Label><div className="flex gap-2"><Input value={form[field] || ""} onChange={(event) => update(field, event.target.value)} placeholder="URL da imagem" /><AssetUpload field={field} busy={uploading === field} onUpload={(file) => upload(field, file)} /></div>{form[field] && <img src={form[field]} alt={assetLabels[suffix]} className="max-h-28 rounded border object-contain" />}</div>; })}</CardContent></Card>
      <Card><CardHeader><CardTitle>Mensagens, integração e atualização</CardTitle><CardDescription>As configurações são entregues ao APK pelo endpoint próprio do aplicativo usando o MAC.</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label>Nome do aplicativo</Label><Input value={form[`${prefix}app_name`] || ""} onChange={(event) => update(`${prefix}app_name`, event.target.value)} /></div><div><Label>Frase de impacto</Label><Textarea value={form[`${prefix}impact_phrase`] || ""} onChange={(event) => update(`${prefix}impact_phrase`, event.target.value)} /></div><div><Label>Título da mensagem</Label><Input value={form[`${prefix}message_title`] || ""} onChange={(event) => update(`${prefix}message_title`, event.target.value)} /></div><div><Label>Mensagem</Label><Textarea value={form[`${prefix}message_text`] || ""} onChange={(event) => update(`${prefix}message_text`, event.target.value)} /></div><div><Label>API do Servidor</Label><Input value={form[`${prefix}server_api_url`] || ""} onChange={(event) => update(`${prefix}server_api_url`, event.target.value)} placeholder="https://..." /></div><div><Label>URL de atualização do APK</Label><Input value={form[`${prefix}apk_download_url`] || ""} onChange={(event) => update(`${prefix}apk_download_url`, event.target.value)} placeholder="https://...apk" /></div><div><Label>Versão do APK</Label><Input value={form[`${prefix}apk_version`] || ""} onChange={(event) => update(`${prefix}apk_version`, event.target.value)} placeholder="Ex.: 1.0.0" /></div></CardContent></Card>
    </div>
  </AdminLayout>;
}
