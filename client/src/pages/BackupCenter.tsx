import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Cloud, CopyCheck, Download, HardDrive, History, Link2, Loader2, Play, RefreshCw, ShieldCheck, ShieldOff, RotateCcw, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const formatDate = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("pt-BR") : "Ainda não executado";
const formatSize = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;

function DriveStatus({ status }: { status: "not_configured" | "success" | "error" }) {
  if (status === "success") return <Badge className="gap-1 bg-emerald-600"><CopyCheck size={12} /> Drive salvo</Badge>;
  if (status === "error") return <Badge variant="destructive">Drive pendente</Badge>;
  return <Badge variant="secondary">Drive não conectado</Badge>;
}

export default function BackupCenter() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const query = trpc.backups.overview.useQuery();
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("googleDrive");
    if (!status) return;
    if (status === "connected") {
      toast.success("Google Drive conectado com sucesso. Os próximos backups serão enviados automaticamente.");
      void utils.backups.overview.invalidate();
    } else {
      toast.error("Não foi possível concluir a conexão com o Google Drive. Tente conectar novamente.");
    }
    setLocation("/backups", { replace: true });
  }, [setLocation, utils.backups.overview]);
  const runNow = trpc.backups.runNow.useMutation({
    onSuccess: (result) => { toast.success(result.alreadyExists ? "O backup automático de hoje já existe." : "Backup criado com sucesso."); utils.backups.overview.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const enable = trpc.backups.enableDaily.useMutation({ onSuccess: () => { toast.success("Backup diário ativado para 03:00."); utils.backups.overview.invalidate(); }, onError: (error) => toast.error(error.message) });
  const disable = trpc.backups.disableDaily.useMutation({ onSuccess: () => { toast.success("Backup diário desativado."); utils.backups.overview.invalidate(); }, onError: (error) => toast.error(error.message) });
  const restore = trpc.backups.restore.useMutation({ onSuccess: () => { toast.success("Backup restaurado. Atualize as páginas do painel para ver os dados."); utils.backups.overview.invalidate(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.backups.remove.useMutation({ onSuccess: () => { toast.success("Backup removido do histórico."); utils.backups.overview.invalidate(); }, onError: (error) => toast.error(error.message) });
  const clearHistory = trpc.backups.clearHistory.useMutation({ onSuccess: () => { toast.success("Histórico de backups limpo."); utils.backups.overview.invalidate(); }, onError: (error) => toast.error(error.message) });
  const connectGoogleDrive = trpc.backups.googleDriveAuthorizationUrl.useMutation({
    onSuccess: ({ url }) => { window.location.assign(url); },
    onError: (error) => toast.error(error.message),
  });
  const setting = query.data?.setting;
  const snapshots = query.data?.snapshots ?? [];
  const googleDrive = query.data?.googleDrive;
  const busy = runNow.isPending || enable.isPending || disable.isPending || restore.isPending || remove.isPending || clearHistory.isPending || connectGoogleDrive.isPending;

  const confirmRestore = (id: number) => {
    if (!window.confirm("Restaurar este backup? Os dados atuais serão atualizados com a cópia selecionada.")) return;
    restore.mutate({ snapshotId: id });
  };

  return <AdminLayout title="Backup Automático"><div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><HardDrive size={17} /> Proteção de dados</div><h1 className="text-2xl font-bold">Backup Automático</h1><p className="mt-1 text-sm text-muted-foreground">Cópia completa no painel, no Google Drive e disponível para download no seu computador.</p><p className="mt-2 text-xs text-muted-foreground">Formato portável 4.0: clientes, MACs, listas, aplicativos, configurações, revendas, permissões, cobranças e registros operacionais.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" disabled={busy} onClick={() => query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button><Button className="gap-2 text-black dark:text-white" disabled={busy} onClick={() => runNow.mutate()}>{runNow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Criar agora</Button></div>
    </div>

    <div className="grid gap-3 lg:grid-cols-4">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck size={18} className="text-emerald-600" /> Rotina diária</CardTitle><CardDescription>O backup automático é executado todos os dias às 03:00 no horário de Brasília e mantém até 30 cópias recentes.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm"><p><strong>Status:</strong> {setting?.enabled ? <Badge className="ml-1">Ativo</Badge> : <Badge variant="secondary" className="ml-1">Desativado</Badge>}</p><p className="mt-1 text-muted-foreground">Última execução: {formatDate(setting?.lastRunAt)} · {setting?.lastStatus === "error" ? `Erro: ${setting.lastError ?? "desconhecido"}` : setting?.lastStatus === "success" ? "Concluída" : "Aguardando ativação"}</p></div>{setting?.enabled ? <Button variant="outline" className="gap-2" disabled={busy} onClick={() => disable.mutate()}><ShieldOff size={16} /> Desativar rotina</Button> : <Button className="gap-2 text-black dark:text-white" disabled={busy} onClick={() => enable.mutate()}><ShieldCheck size={16} /> Ativar às 03:00</Button>}</CardContent></Card>
      <Card><CardContent className="p-5"><History size={20} className="mb-3 text-primary" /><p className="text-3xl font-bold">{snapshots.length}</p><p className="mt-1 text-sm text-muted-foreground">backup(s) no histórico</p></CardContent></Card>
      <Card><CardContent className="p-5"><Cloud size={20} className={`mb-3 ${googleDrive?.status === "connected" ? "text-emerald-600" : "text-primary"}`} /><p className="font-semibold">Google Drive</p>{googleDrive ? <><Badge className={`mt-2 ${googleDrive.status === "connected" ? "bg-emerald-600" : ""}`} variant={googleDrive.status === "connected" ? "default" : "destructive"}>{googleDrive.status === "connected" ? "Conectado" : "Requer atenção"}</Badge><p className="mt-2 truncate text-xs text-muted-foreground" title={googleDrive.folderName}>{googleDrive.folderName}</p><p className="mt-1 text-xs text-muted-foreground">Última cópia: {formatDate(googleDrive.lastSuccessAt)}</p></> : <><p className="mt-1 text-xs text-muted-foreground">Faça uma autorização única para proteger as cópias diárias.</p><p className="mt-2 break-all text-[10px] leading-4 text-muted-foreground">Retorno: renciaapp.manus.space/api/google-drive/oauth/callback</p><Button size="sm" className="mt-3 w-full gap-1.5" disabled={busy} onClick={() => connectGoogleDrive.mutate({ origin: window.location.origin })}>{connectGoogleDrive.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar Drive</Button></>}</CardContent></Card>
    </div>

    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base">Histórico de cópias</CardTitle><Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={!snapshots.length || busy} onClick={() => { if (window.confirm("Remover todos os backups do histórico? Depois será necessário criar uma nova cópia para restaurar dados.")) clearHistory.mutate(); }}><Trash2 size={14} /> Limpar</Button></div><CardDescription>Baixe o arquivo JSON completo para o computador ou celular, restaure ou remova uma cópia individual. Remover retira apenas o histórico do painel.</CardDescription></CardHeader><CardContent className="p-0"><div className="space-y-3 p-4 md:hidden">{snapshots.map((snapshot) => <div key={snapshot.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{formatDate(snapshot.createdAt)}</p><p className="mt-1 text-xs text-muted-foreground">{formatSize(snapshot.fileSize)} · JSON portável</p></div><Badge variant={snapshot.type === "automatic" ? "secondary" : "default"}>{snapshot.type === "automatic" ? "Automático" : "Manual"}</Badge></div><div className="mt-3"><DriveStatus status={snapshot.googleDriveStatus} /></div><div className="mt-4 grid grid-cols-2 gap-2"><Button asChild size="sm" variant="outline" className="gap-1.5"><a href={`/api/backups/${snapshot.id}/download`} download><Download size={14} /> Baixar arquivo</a></Button><Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => confirmRestore(snapshot.id)}><RotateCcw size={14} /> Restaurar</Button></div><Button size="sm" variant="ghost" className="mt-2 w-full gap-1.5 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => { if (window.confirm("Remover este backup do histórico?")) remove.mutate({ snapshotId: snapshot.id }); }}><Trash2 size={14} /> Remover cópia</Button></div>)}{!query.isLoading && !snapshots.length && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum backup criado ainda. Use “Criar agora” para gerar a primeira cópia.</p>}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[840px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Tamanho</th><th className="px-5 py-3">Google Drive</th><th className="px-5 py-3">Ações</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id} className="border-b last:border-0"><td className="px-5 py-4">{formatDate(snapshot.createdAt)}</td><td className="px-5 py-4"><Badge variant={snapshot.type === "automatic" ? "secondary" : "default"}>{snapshot.type === "automatic" ? "Automático" : "Manual"}</Badge></td><td className="px-5 py-4">{formatSize(snapshot.fileSize)} · JSON</td><td className="px-5 py-4"><DriveStatus status={snapshot.googleDriveStatus} /></td><td className="px-5 py-4"><div className="flex gap-2"><Button asChild size="sm" variant="outline" className="gap-1.5"><a href={`/api/backups/${snapshot.id}/download`} download><Download size={14} /> Baixar arquivo</a></Button><Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => confirmRestore(snapshot.id)}><RotateCcw size={14} /> Restaurar</Button><Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={busy} onClick={() => { if (window.confirm("Remover este backup do histórico?")) remove.mutate({ snapshotId: snapshot.id }); }}><Trash2 size={15} /></Button></div></td></tr>)}{!query.isLoading && !snapshots.length && <tr><td colSpan={5} className="px-5 py-14 text-center text-muted-foreground">Nenhum backup criado ainda. Use “Criar agora” para gerar a primeira cópia.</td></tr>}</tbody></table></div></CardContent></Card>
  </div></AdminLayout>;
}
