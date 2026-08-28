import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Copy, Check, ExternalLink, Save, Edit2, Store, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { MANAGED_APP_CATALOG } from "@shared/appCatalog";
import { PUBLIC_STORE_URL } from "@shared/publicStore";

type PublicSlug = "ouropro" | "ultra" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux" | "ominus" | "magnus" | "excellence" | "future";

const PUBLIC_SHORT_PATHS: Record<PublicSlug, string> = {
  ouropro: "/o",
  ultra: "/u",
  maximus: "/m",
  prestige: "/p",
  optimus: "/x",
  imperio: "/i",
  infinitus: "/n",
  supremus: "/s",
  evolux: "/e",
  ominus: "/om",
  magnus: "/g",
  excellence: "/ex",
  future: "/f",
};

interface AppConfig {
  name: string;
  logo: string;
  color: "yellow" | "blue" | "purple" | "rose" | "emerald" | "orange" | "indigo" | "pink" | "cyan";
  publicSlug: PublicSlug;
}

const APPS: AppConfig[] = [
  { name: "Ouro Pro", logo: MANAGED_APP_CATALOG.ouropro.defaultLogoUrl, color: "yellow", publicSlug: "ouropro" },
  { name: "Fusion", logo: MANAGED_APP_CATALOG.fusion.defaultLogoUrl, color: "purple", publicSlug: "ultra" },
  { name: "Maximus Player", logo: MANAGED_APP_CATALOG.maximus.defaultLogoUrl, color: "blue", publicSlug: "maximus" },
  { name: "Prestige", logo: MANAGED_APP_CATALOG.prestige.defaultLogoUrl, color: "rose", publicSlug: "prestige" },
  { name: "Optimus", logo: MANAGED_APP_CATALOG.optimus.defaultLogoUrl, color: "emerald", publicSlug: "optimus" },
  { name: "Império Play", logo: MANAGED_APP_CATALOG.imperio.defaultLogoUrl, color: "orange", publicSlug: "imperio" },
  { name: "Infinitus", logo: MANAGED_APP_CATALOG.infinitus.defaultLogoUrl, color: "indigo", publicSlug: "infinitus" },
  { name: "Supreme", logo: MANAGED_APP_CATALOG.supremus.defaultLogoUrl, color: "pink", publicSlug: "supremus" },
  { name: "Evolux", logo: MANAGED_APP_CATALOG.evolux.defaultLogoUrl, color: "cyan", publicSlug: "evolux" },
  { name: "Ominus", logo: MANAGED_APP_CATALOG.ominus.defaultLogoUrl, color: "indigo", publicSlug: "ominus" },
  { name: "Magnus", logo: MANAGED_APP_CATALOG.magnus.defaultLogoUrl, color: "orange", publicSlug: "magnus" },
  { name: "Excellence", logo: MANAGED_APP_CATALOG.excellence.defaultLogoUrl, color: "purple", publicSlug: "excellence" },
  { name: "Future", logo: MANAGED_APP_CATALOG.future.defaultLogoUrl, color: "cyan", publicSlug: "future" },
];

function fallbackDownload(settings: Record<string, string> | undefined, slug: PublicSlug) {
  if (slug === "ouropro") return settings?.apk_download_url || "";
  if (slug === "ultra") return settings?.ultra_apk_download_url || "";
  if (slug === "prestige") return settings?.prestige_apk_download_url || "";
  if (slug === "optimus") return settings?.optimus_apk_download_url || "";
  if (slug === "imperio") return settings?.imperio_apk_download_url || "";
  if (slug === "infinitus") return settings?.infinitus_apk_download_url || "";
  if (slug === "supremus") return settings?.supremus_apk_download_url || "";
  if (slug === "evolux") return settings?.evolux_apk_download_url || "";
  if (slug === "ominus") return settings?.ominus_apk_download_url || "";
  if (slug === "magnus") return settings?.magnus_apk_download_url || "";
  if (slug === "excellence") return settings?.excellence_apk_download_url || "";
  if (slug === "future") return settings?.future_apk_download_url || "";
  return settings?.maximus_download_url || settings?.gpcpro_apk_download_url || "";
}

function fallbackVersion(settings: Record<string, string> | undefined, slug: PublicSlug) {
  if (slug === "ouropro") return settings?.apk_version || "";
  if (slug === "ultra") return settings?.ultra_apk_version || "";
  if (slug === "prestige") return settings?.prestige_apk_version || "";
  if (slug === "optimus") return settings?.optimus_apk_version || "";
  if (slug === "imperio") return settings?.imperio_apk_version || "";
  if (slug === "infinitus") return settings?.infinitus_apk_version || "";
  if (slug === "supremus") return settings?.supremus_apk_version || "";
  if (slug === "evolux") return settings?.evolux_apk_version || "";
  if (slug === "ominus") return settings?.ominus_apk_version || "";
  if (slug === "magnus") return settings?.magnus_apk_version || "";
  if (slug === "excellence") return settings?.excellence_apk_version || "";
  if (slug === "future") return settings?.future_apk_version || "";
  return settings?.maximus_version || settings?.gpcpro_apk_version || "";
}

function AppCard({ app }: { app: AppConfig }) {
  const { data: settings, refetch } = trpc.settings.getAll.useQuery();
  const updateMany = trpc.settings.updateMany.useMutation({
    onSuccess: () => {
      refetch();
      setEditMode(false);
      toast.success(`${app.name} atualizado na Loja Pública.`);
    },
    onError: () => toast.error("Não foi possível salvar as configurações."),
  });
  const publicBaseUrl = typeof window === "undefined" ? "" : `${window.location.origin}${PUBLIC_SHORT_PATHS[app.publicSlug]}`;
  const downloadUrl = settings?.[`public_${app.publicSlug}_download_url`] || fallbackDownload(settings, app.publicSlug);
  const version = settings?.[`public_${app.publicSlug}_version`] || fallbackVersion(settings, app.publicSlug) || "Versão atual";
  const downloaderCode = settings?.[`public_${app.publicSlug}_downloader_code`] || "";
  const aftvUrl = settings?.[`public_${app.publicSlug}_aftv_url`] || "";
  const active = settings?.[`public_${app.publicSlug}_active`] !== "false";

  const [editMode, setEditMode] = useState(false);
  const [editDownloadUrl, setEditDownloadUrl] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editDownloaderCode, setEditDownloaderCode] = useState("");
  const [editAftvUrl, setEditAftvUrl] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [copied, setCopied] = useState(false);

  const beginEdit = () => {
    setEditDownloadUrl(downloadUrl);
    setEditVersion(version === "Versão atual" ? "" : version);
    setEditDownloaderCode(downloaderCode);
    setEditAftvUrl(aftvUrl);
    setEditActive(active);
    setEditMode(true);
  };

  const copyPublicUrl = () => navigator.clipboard.writeText(publicBaseUrl).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link público copiado!");
  });

  const save = () => {
    if (editActive && !editDownloadUrl.trim()) {
      toast.error("Informe o link final do APK antes de liberar o aplicativo.");
      return;
    }
    updateMany.mutate({
      [`public_${app.publicSlug}_download_url`]: editDownloadUrl.trim(),
      [`public_${app.publicSlug}_version`]: editVersion.trim(),
      [`public_${app.publicSlug}_downloader_code`]: editDownloaderCode.trim(),
      [`public_${app.publicSlug}_aftv_url`]: editAftvUrl.trim(),
      [`public_${app.publicSlug}_active`]: String(editActive),
    });
  };

  const cardClasses = {
    yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20",
    rose: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20",
    emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20",
    orange: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20",
    indigo: "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20",
    pink: "border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/20",
    cyan: "border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/20",
  };
  const buttonClasses = { yellow: "bg-yellow-600 hover:bg-yellow-700", blue: "bg-blue-600 hover:bg-blue-700", purple: "bg-violet-600 hover:bg-violet-700" };
  const extendedButtonClasses = { ...buttonClasses, rose: "bg-rose-600 hover:bg-rose-700", emerald: "bg-emerald-600 hover:bg-emerald-700", orange: "bg-orange-600 hover:bg-orange-700", indigo: "bg-indigo-600 hover:bg-indigo-700", pink: "bg-pink-600 hover:bg-pink-700", cyan: "bg-cyan-600 hover:bg-cyan-700" };

  return <Card className={cardClasses[app.color]}>
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-black/10 dark:bg-white/10">
            {app.logo ? <img src={app.logo} alt={app.name} className="h-full w-full object-cover" /> : <Store className="text-muted-foreground" />}
          </div>
          <div><CardTitle className="text-lg">{app.name}</CardTitle><div className="mt-1 flex gap-2"><Badge variant="outline">{version}</Badge><Badge variant={active ? "default" : "secondary"}>{active ? "Público" : "Oculto"}</Badge></div></div>
        </div>
        {!editMode && <Button size="sm" variant="ghost" onClick={beginEdit} className="gap-1"><Edit2 size={14} /> Editar</Button>}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {editMode ? <>
        <div className="space-y-2"><Label>Link final do APK</Label><Input value={editDownloadUrl} onChange={event => setEditDownloadUrl(event.target.value)} placeholder="https://.../meu-aplicativo.apk" className="font-mono text-sm" /></div>
        <div className="space-y-2"><Label>Versão exibida ao cliente</Label><Input value={editVersion} onChange={event => setEditVersion(event.target.value)} placeholder="Ex.: 7.1.0" /></div>
        <div className="space-y-2"><Label>Código numérico do Downloader</Label><Input value={editDownloaderCode} onChange={event => setEditDownloaderCode(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ex.: 7469834" /></div>
        <div className="space-y-2"><Label>Link curto AFTV</Label><Input value={editAftvUrl} onChange={event => setEditAftvUrl(event.target.value)} placeholder="https://aftv.news/7469834" /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><div><p className="font-medium">Disponível na loja pública</p><p className="text-xs text-muted-foreground">Quando desligado, o aplicativo não aparece para clientes.</p></div><Switch checked={editActive} onCheckedChange={setEditActive} /></div>
        <div className="flex gap-2"><Button onClick={save} disabled={updateMany.isPending} className={`flex-1 gap-2 text-white ${extendedButtonClasses[app.color]}`}><Save size={16} />{updateMany.isPending ? "Salvando..." : "Salvar"}</Button><Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button></div>
      </> : <>
        <div className="space-y-2"><Label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"><Link2 size={12} /> Link curto para enviar ao cliente</Label><div className="flex gap-2"><div className="flex-1 rounded-lg border bg-white/70 px-3 py-2 dark:bg-black/20"><p className="break-all text-xs font-mono font-bold">{publicBaseUrl}</p></div><Button size="sm" variant="outline" onClick={copyPublicUrl}>{copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}</Button></div></div>
        <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider">Destino atual do download</Label><p className="break-all rounded-lg border bg-white/70 px-3 py-2 text-xs font-mono dark:bg-black/20">{downloadUrl || "Defina o link do APK em Editar"}</p></div>
        {downloaderCode && <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-center dark:bg-amber-400/10"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-200">Código Downloader</p><p className="mt-1 text-2xl font-black tracking-[.18em] text-amber-700 dark:text-amber-300">{downloaderCode}</p></div>}
        {aftvUrl && <a href={aftvUrl} target="_blank" rel="noopener noreferrer" className="block break-all rounded-lg border border-sky-400/30 bg-sky-50 px-3 py-2 text-center text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-200">{aftvUrl}</a>}
        <div className="flex gap-2"><a href={publicBaseUrl} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="outline" className="w-full gap-2"><ExternalLink size={16} /> Ver página pública</Button></a>{downloadUrl && <a href={downloadUrl} target="_blank" rel="noopener noreferrer"><Button className={`gap-2 text-white ${extendedButtonClasses[app.color]}`}><Download size={16} /> Baixar</Button></a>}</div>
      </>}
    </CardContent>
  </Card>;
}

export default function Loja() {
  return <AdminLayout title="Loja de Aplicativos"><div className="mx-auto max-w-6xl space-y-6"><div className="py-6 text-center"><h1 className="text-3xl font-bold tracking-tight">Loja de Aplicativos</h1><p className="mt-2 text-muted-foreground">Configure o link público de cada aplicativo para enviar aos seus clientes.</p><a href={PUBLIC_STORE_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex"><Button className="gap-2 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"><Store size={18} /> Loja de Todos os Aplicativos <ExternalLink size={16} /></Button></a></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2">{APPS.map(app => <AppCard key={app.publicSlug} app={app} />)}</div></div></AdminLayout>;
}
