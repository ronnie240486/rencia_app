import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";

const DEFAULTS: Record<string, string> = {
  ultra_app_name: "Fusion",
  ultra_logo_url: "/manus-storage/ultra-player-logo_efd734bc.png",
  ultra_banner_url: "",
  ultra_background_url: "",
  ultra_message_image_url: "",
  ultra_icon_live_tv_url: "",
  ultra_icon_movies_url: "",
  ultra_icon_series_url: "",
  ultra_impact_phrase: "",
  ultra_message_title: "",
  ultra_message_text: "",
  ultra_server_api_url: "",
  ultra_apk_download_url: "",
  ultra_apk_version: "",
};

function ImageUpload({ field, busy, onUpload }: { field: string; busy: boolean; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={e => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
      e.target.value = "";
    }} />
    <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} disabled={busy} title={`Enviar imagem para ${field}`}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
    </Button>
  </>;
}

export default function SettingsUltra() {
  const { data: settings, isLoading, refetch } = trpc.settings.getAll.useQuery();
  const save = trpc.settings.updateMany.useMutation({ onSuccess: () => { toast.success("Configurações do Fusion salvas!"); refetch(); } });
  const [form, setForm] = useState(DEFAULTS);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const settingsInitializedRef = useRef(false);

  useEffect(() => {
    if (!settings || settingsInitializedRef.current) return;
    const merged = { ...DEFAULTS };
    Object.entries(settings).forEach(([key, value]) => { if (key.startsWith("ultra_") && value != null) merged[key] = String(value); });
    if (merged.ultra_app_name === "Ultra Player") merged.ultra_app_name = "Fusion";
    setForm(merged);
    settingsInitializedRef.current = true;
  }, [settings]);

  const update = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };
  const upload = async (field: string, file: File) => {
    try {
      setUploading(field);
      const body = new FormData();
      body.append("image", file);
      body.append("field", field);
      const response = await fetch("/api/upload-image", { method: "POST", body, credentials: "include" });
      if (!response.ok) throw new Error("Não foi possível enviar a imagem");
      const { url } = await response.json() as { url: string };
      const next = { ...form, [field]: url };
      setForm(next);
      await save.mutateAsync(next);
      setDirty(false);
      toast.success("Imagem enviada e salva!");
    } catch (error: any) { toast.error(error.message ?? "Erro no upload"); }
    finally { setUploading(null); }
  };
  const imageFields = [
    ["ultra_logo_url", "Logo / ícone do Fusion", "Ícone exibido na Loja e no aplicativo"],
    ["ultra_banner_url", "Banner", "Banner principal do aplicativo"],
    ["ultra_background_url", "Imagem de fundo", "Fundo da tela inicial do aplicativo"],
    ["ultra_message_image_url", "Imagem de mensagem", "Imagem usada nos avisos e mensagens"],
    ["ultra_icon_live_tv_url", "Ícone de Canais", "Ícone do botão de canais ao vivo"],
    ["ultra_icon_movies_url", "Ícone de Filmes", "Ícone do botão de filmes"],
    ["ultra_icon_series_url", "Ícone de Séries", "Ícone do botão de séries"],
  ] as const;

  if (isLoading) return <AdminLayout title="Fusion"><div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div></AdminLayout>;
  return <AdminLayout title="Fusion">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Fusion</h1><p className="text-sm text-muted-foreground">Imagens, mensagens e API configuráveis com upload direto.</p></div>
        <Button onClick={() => save.mutate(form, { onSuccess: () => setDirty(false) })} disabled={!dirty || save.isPending} className="gap-2 btn-save"><Save size={16} />Salvar alterações</Button>
      </div>
      <Card><CardHeader><CardTitle>Imagens e ícones</CardTitle><CardDescription>Use o botão de upload para mudar logo, banner, fundo, mensagem e os ícones de Canais, Filmes e Séries. A URL será preenchida automaticamente.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        {imageFields.map(([field, label, hint]) => <div className="space-y-2" key={field}><Label>{label}</Label><div className="flex gap-2"><Input value={form[field]} onChange={e => update(field, e.target.value)} placeholder="URL da imagem" /><ImageUpload field={field} busy={uploading === field} onUpload={file => upload(field, file)} /></div><p className="text-xs text-muted-foreground">{hint}</p>{form[field] && <img src={form[field]} className="max-h-28 rounded border object-contain" alt={label} />}</div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Mensagens e conexão</CardTitle><CardDescription>Dados enviados ao APK quando o desenvolvedor integrar a rota do Fusion.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div><Label>Nome do aplicativo</Label><Input value={form.ultra_app_name} onChange={e => update("ultra_app_name", e.target.value)} /></div>
        <div><Label>Frase de impacto</Label><Textarea value={form.ultra_impact_phrase} onChange={e => update("ultra_impact_phrase", e.target.value)} /></div>
        <div><Label>Título da mensagem</Label><Input value={form.ultra_message_title} onChange={e => update("ultra_message_title", e.target.value)} /></div>
        <div><Label>Mensagem</Label><Textarea value={form.ultra_message_text} onChange={e => update("ultra_message_text", e.target.value)} /></div>
        <div><Label>API do Servidor</Label><Input value={form.ultra_server_api_url} onChange={e => update("ultra_server_api_url", e.target.value)} placeholder="https://..." /></div>
        <div><Label>URL de atualização do Fusion</Label><Input value={form.ultra_apk_download_url} onChange={e => update("ultra_apk_download_url", e.target.value)} placeholder="https://...apk" /><p className="text-xs text-muted-foreground">Usada somente pelo botão de atualização do Fusion.</p></div>
        <div><Label>Versão do Fusion</Label><Input value={form.ultra_apk_version} onChange={e => update("ultra_apk_version", e.target.value)} placeholder="Ex.: 1.0.0" /></div>
      </CardContent></Card>
    </div>
  </AdminLayout>;
}
