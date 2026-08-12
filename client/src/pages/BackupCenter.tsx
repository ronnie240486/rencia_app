import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Download, HardDrive, History, Loader2, Play, RefreshCw, ShieldCheck, ShieldOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const date = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("pt-BR") : "Ainda não executado";
const size = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;

export default function BackupCenter() {
  const utils = trpc.useUtils();
  const query = trpc.backups.overview.useQuery();
  const runNow = trpc.backups.runNow.useMutation({
    onSuccess: (result) => { toast.success(result.alreadyExists ? "O backup automático de hoje já existe." : "Backup criado com sucesso."); utils.backups.overview.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const enable = trpc.backups.enableDaily.useMutation({
    onSuccess: () => { toast.success("Backup diário ativado para 03:00."); utils.backups.overview.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const disable = trpc.backups.disableDaily.useMutation({
    onSuccess: () => { toast.success("Backup diário desativado."); utils.backups.overview.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const restore = trpc.backups.restore.useMutation({
    onSuccess: () => { toast.success("Backup restaurado. Atualize as páginas do painel para ver os dados."); utils.backups.overview.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const setting = query.data?.setting;
  const snapshots = query.data?.snapshots ?? [];
  const busy = runNow.isPending || enable.isPending || disable.isPending || restore.isPending;

  const confirmRestore = (id: number) => {
    if (!window.confirm("Restaurar este backup? Os dados atuais serão atualizados com a cópia selecionada.")) return;
    restore.mutate({ snapshotId: id });
  };

  return <AdminLayout title="Backup Automático"><div className="space-y-6">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><HardDrive size={17} /> Proteção de dados</div><h1 className="text-2xl font-bold">Backup Automático</h1><p className="mt-1 text-sm text-muted-foreground">Mantenha cópias completas de usuários, listas e configurações fora do banco principal.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" disabled={busy} onClick={() => query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Atualizar</Button><Button className="gap-2 text-black dark:text-white" disabled={busy} onClick={() => runNow.mutate()}>{runNow.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Criar agora</Button></div></div>
    <div className="grid gap-3 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck size={18} className="text-emerald-600" /> Rotina diária</CardTitle><CardDescription>O backup automático é executado todos os dias às 03:00 no horário de Brasília e mantém até 30 cópias recentes.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm"><p><strong>Status:</strong> {setting?.enabled ? <Badge className="ml-1">Ativo</Badge> : <Badge variant="secondary" className="ml-1">Desativado</Badge>}</p><p className="mt-1 text-muted-foreground">Última execução: {date(setting?.lastRunAt)} · {setting?.lastStatus === "error" ? `Erro: ${setting.lastError ?? "desconhecido"}` : setting?.lastStatus === "success" ? "Concluída" : "Aguardando ativação"}</p></div>{setting?.enabled ? <Button variant="outline" className="gap-2" disabled={busy} onClick={() => disable.mutate()}><ShieldOff size={16} /> Desativar rotina</Button> : <Button className="gap-2 text-black dark:text-white" disabled={busy} onClick={() => enable.mutate()}><ShieldCheck size={16} /> Ativar às 03:00</Button>}</CardContent></Card><Card><CardContent className="p-5"><History size={20} className="mb-3 text-primary" /><p className="text-3xl font-bold">{snapshots.length}</p><p className="mt-1 text-sm text-muted-foreground">backup(s) no histórico</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-base">Histórico de cópias</CardTitle><CardDescription>Baixe uma cópia individual ou restaure somente após confirmar.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Tamanho</th><th className="px-5 py-3">Ações</th></tr></thead><tbody>{snapshots.map((snapshot) => <tr key={snapshot.id} className="border-b last:border-0"><td className="px-5 py-4">{date(snapshot.createdAt)}</td><td className="px-5 py-4"><Badge variant={snapshot.type === "automatic" ? "secondary" : "default"}>{snapshot.type === "automatic" ? "Automático" : "Manual"}</Badge></td><td className="px-5 py-4">{size(snapshot.fileSize)}</td><td className="px-5 py-4"><div className="flex gap-2"><Button asChild size="sm" variant="outline" className="gap-1.5"><a href={snapshot.storageUrl} target="_blank" rel="noreferrer"><Download size={14} /> Baixar</a></Button><Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => confirmRestore(snapshot.id)}><RotateCcw size={14} /> Restaurar</Button></div></td></tr>)}{!query.isLoading && !snapshots.length && <tr><td colSpan={4} className="px-5 py-14 text-center text-muted-foreground">Nenhum backup criado ainda. Use “Criar agora” para gerar a primeira cópia.</td></tr>}</tbody></table></div></CardContent></Card>
  </div></AdminLayout>;
}
