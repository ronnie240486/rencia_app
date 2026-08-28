import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { MANAGED_APP_CATALOG, type ManagedAppId } from "@shared/appCatalog";
import { CheckCircle2, Copy, Link2, Loader2, Save, Server } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const CURRENT_ORIGIN = "https://renciaapp.manus.space";
const managedApps = Object.values(MANAGED_APP_CATALOG);

function settingKey(appId: ManagedAppId) {
  return `app_api_origin_${appId}`;
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return CURRENT_ORIGIN;
  try { return new URL(trimmed).origin; } catch { return null; }
}

export default function AppServerDirectory() {
  const { data: directory, isLoading, refetch } = trpc.appServerDirectory.get.useQuery();
  const save = trpc.appServerDirectory.update.useMutation({
    onSuccess: () => { toast.success("Endereços salvos. Nenhum aplicativo foi redirecionado automaticamente."); refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!directory) return;
    setValues(Object.fromEntries(managedApps.map((app) => [settingKey(app.id), String(directory.origins[app.id] || "")] )));
  }, [directory]);

  const hasChanges = useMemo(() => managedApps.some((app) => String(directory?.origins[app.id] || "") !== (values[settingKey(app.id)] || "")), [directory, values]);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast.success("Rota copiada."); } catch { toast.error("Não foi possível copiar a rota."); } };
  const saveDirectory = () => {
    for (const app of managedApps) {
      const value = values[settingKey(app.id)] || "";
      if (value && !normalizeOrigin(value)) { toast.error(`O endereço de ${app.displayName} precisa começar com http:// ou https://.`); return; }
    }
    save.mutate({ origins: Object.fromEntries(managedApps.map((app) => [app.id, values[settingKey(app.id)] || ""])) });
  };

  return <AdminLayout title="Central de Endereços"><div className="mx-auto max-w-6xl space-y-6 p-1 sm:p-3">
    <div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Server size={24} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Preparação para domínio próprio</p><h1 className="mt-1 text-2xl font-black">Central de Endereços</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Defina o domínio que cada APK atualizado deve usar. Enquanto o campo estiver vazio, o endereço atual continua sendo usado.</p></div></div><Button className="btn-save gap-2" disabled={!hasChanges || save.isPending || isLoading} onClick={saveDirectory}>{save.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar endereços</Button></div></div>

    <Card className="border-primary/25 bg-primary/[0.035]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="text-primary" size={19} /> Sem interrupção dos aplicativos atuais</CardTitle><CardDescription>Salvar um endereço aqui não muda nenhum APK automaticamente. Quando o desenvolvedor integrar a rota de descoberta uma única vez, você poderá trocar de hospedagem alterando somente este campo.</CardDescription></CardHeader></Card>

    <div className="grid gap-4 md:grid-cols-2">{managedApps.map((app) => {
      const key = settingKey(app.id);
      const configured = normalizeOrigin(values[key] || "");
      const origin = configured || CURRENT_ORIGIN;
      const discovery = `${origin}/api/v5/apps/${app.id}/discovery`;
      return <Card key={app.id}><CardHeader className="pb-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted p-1.5">{app.defaultLogoUrl ? <img src={app.defaultLogoUrl} alt="" className="h-full w-full object-contain" /> : <Link2 className="text-muted-foreground" size={20} />}</div><div><CardTitle className="text-base">{app.displayName}</CardTitle><CardDescription>{values[key] ? "Domínio próprio preparado" : "Usando endereço atual"}</CardDescription></div></div></CardHeader><CardContent className="space-y-3"><div className="space-y-1.5"><Label htmlFor={key}>Endereço da API</Label><Input id={key} type="url" placeholder={CURRENT_ORIGIN} value={values[key] || ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /><p className="text-xs text-muted-foreground">Use somente o domínio, por exemplo: `https://appplus.top`.</p></div><div className="rounded-lg bg-muted/60 p-2"><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rota para o desenvolvedor integrar</p><div className="flex items-center gap-1"><code className="min-w-0 flex-1 break-all text-xs">{discovery}</code><Button variant="ghost" size="icon" title="Copiar rota" onClick={() => copy(discovery)}><Copy size={15} /></Button></div></div></CardContent></Card>;
    })}</div>

    <Card><CardHeader><CardTitle>Como funciona</CardTitle><CardDescription>O APK consulta a rota de descoberta na abertura e salva as rotas retornadas. No futuro, você poderá apontar esse domínio para outro servidor sem pedir nova atualização do APK.</CardDescription></CardHeader><CardContent><code className="block break-all rounded-lg bg-muted p-3 text-xs">GET https://SEU-DOMINIO/api/v5/apps/ID_DO_APP/discovery</code></CardContent></Card>
  </div></AdminLayout>;
}
