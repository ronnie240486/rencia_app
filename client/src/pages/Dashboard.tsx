import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MANAGED_APP_CATALOG } from "@shared/appCatalog";
import { getConnectedQueryMinutes, isWithinConnectedWindow, type ConnectedFilter } from "@shared/connectedWindow";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle, CalendarDays, Crown, Layers, Search, Shield,
  Star, Users, Wifi, WifiOff, RefreshCw, Activity, Download, Upload,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";

function EditCurrentContentButton({ deviceId, currentContent }: { deviceId: number; currentContent: string | null }) {
  const updateMutation = trpc.devices.updateCurrentContent.useMutation();
  
  const handleEdit = () => {
    const newContent = prompt('Canal assistido:', currentContent || '');
    if (newContent !== null) {
      updateMutation.mutate({
        id: deviceId,
        currentContent: newContent || null
      });
    }
  };
  
  return (
    <button
      onClick={handleEdit}
      disabled={updateMutation.isPending}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 py-0.5 rounded hover:bg-muted disabled:opacity-50"
      title="Editar"
    >
      {updateMutation.isPending ? '...' : '✎'}
    </button>
  );
}

function ForceShowChannelToggle({ deviceId, forceShowChannel }: { deviceId: number; forceShowChannel: boolean }) {
  const updateMutation = trpc.devices.updateForceShowChannel.useMutation();
  
  const handleToggle = () => {
    updateMutation.mutate({
      id: deviceId,
      forceShowChannel: !forceShowChannel
    });
  };
  
  return (
    <button
      onClick={handleToggle}
      disabled={updateMutation.isPending}
      className={`w-8 h-4 rounded-full transition-colors ${forceShowChannel ? 'bg-green-500' : 'bg-muted'} flex items-center px-0.5`}
      title={forceShowChannel ? 'Forçar canal ativado' : 'Forçar canal desativado'}
    >
      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${forceShowChannel ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: number | string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              <span>{title}</span>
            </p>
            <p className="text-2xl font-bold text-foreground">
              <span>{value}</span>
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recentSearch, setRecentSearch] = useState("");
  // APKs antigos do OuroPro podem registrar o episódio apenas ao iniciá-lo.
  // Duas horas evitam que esse último conteúdo suma logo depois de iniciar.
  const [connectedFilter, setConnectedFilter] = useState<ConnectedFilter>("online");
  const [pendingBackup, setPendingBackup] = useState<any | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [backupReminderOpen, setBackupReminderOpen] = useState(false);
  const [monthlyClosureOpen, setMonthlyClosureOpen] = useState(false);

  const backupWeekKey = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now.getTime() - start.getTime()) / 86_400_000) + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-${week}`;
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/v5/export-backup', { 
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Não foi possível gerar o backup completo.');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const handleLegacyExport = async () => {
    try {
      const response = await fetch('/api/v5/export-backup-v2', { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error('Não foi possível gerar o backup compatível.');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-compativel-v2-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível gerar o backup compatível.');
    }
  };

  useEffect(() => {
    if (!user?.isOwner) return;
    const currentWeek = backupWeekKey();
    if (localStorage.getItem('rencia-backup-reminder-week') !== currentWeek) setBackupReminderOpen(true);
  }, [user?.isOwner]);

  const dismissBackupReminder = () => {
    localStorage.setItem('rencia-backup-reminder-week', backupWeekKey());
    setBackupReminderOpen(false);
  };

  const downloadBackupFromReminder = async () => {
    await handleExport();
    dismissBackupReminder();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPreviewingImport(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const response = await fetch('/api/v5/preview-import-backup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Não foi possível analisar o backup.');
      setPendingBackup(data);
      setImportPreview(result.preview);
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert(error instanceof Error ? error.message : 'Não foi possível analisar o arquivo.');
    } finally {
      setPreviewingImport(false);
      e.target.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingBackup) return;
    setConfirmingImport(true);
    try {
      const response = await fetch('/api/v5/import-backup', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingBackup) });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Não foi possível importar o backup.');
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao importar backup.');
    } finally {
      setConfirmingImport(false);
    }
  };

  const { data: stats, isLoading: statsLoading, error: statsError } = trpc.devices.stats.useQuery();
  const monthlyPreviewQuery = trpc.monthlyRevenue.previewPrevious.useQuery(undefined, { enabled: Boolean(user?.isOwner) });
  const monthlyPreview = monthlyPreviewQuery.data;
  const scheduleStatus = trpc.monthlyRevenue.scheduleStatus.useQuery(undefined, { enabled: Boolean(user?.isOwner) });
  const closeMonthly = trpc.monthlyRevenue.closePrevious.useMutation({ onSuccess: () => monthlyPreviewQuery.refetch() });
  const enableMonthlySchedule = trpc.monthlyRevenue.enableSchedule.useMutation({ onSuccess: () => scheduleStatus.refetch() });
  const disableMonthlySchedule = trpc.monthlyRevenue.disableSchedule.useMutation({ onSuccess: () => scheduleStatus.refetch() });
  const { data: appStats } = trpc.ranking.appStats.useQuery();
  const { data: planInfo } = trpc.plan.info.useQuery();
  const { data: recentDevices, isLoading: recentLoading } = trpc.devices.recentList.useQuery({ search: recentSearch, limit: 5 });
  const { data: expiringSoon } = trpc.devices.expiringSoon.useQuery({ days: 7 });
  useEffect(() => {
    if (user?.isOwner && new Date().getDate() === 1 && monthlyPreview && !monthlyPreview.saved) setMonthlyClosureOpen(true);
  }, [user?.isOwner, monthlyPreview]);

  const downloadMonthlyClosure = () => {
    const report = monthlyPreview?.report;
    if (!report) return;
    const blob = new Blob([JSON.stringify({ ...report, whatsappMessage: monthlyPreview.whatsappMessage }, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fechamento-${report.periodStart.slice(0, 7)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyMonthlyWhatsApp = async () => {
    if (!monthlyPreview?.whatsappMessage) return;
    await navigator.clipboard?.writeText(monthlyPreview.whatsappMessage);
    alert("Mensagem do fechamento copiada para o WhatsApp.");
  };

  const { data: connectedDevices, isLoading: connectedLoading, isFetching: connectedRefreshing, refetch: refetchConnected } = trpc.connected.list.useQuery(
    // O filtro escolhido continua visível, mas a listagem nunca remove Assistindo antes de 2 horas.
    { minutesAgo: getConnectedQueryMinutes(connectedFilter) },
    { refetchInterval: 60_000 } // atualiza a cada 1 minuto para mostrar canal assistido em tempo real
  );

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
  };

  const formatLastSeen = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR });
    } catch { return "—"; }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const miniRanking = useMemo(() => [
    { id: "ouropro", name: "Ouro Pro", logo: MANAGED_APP_CATALOG.ouropro.defaultLogoUrl, count: appStats?.ouropro ?? 0 },
    { id: "maximus", name: "Maximus", logo: MANAGED_APP_CATALOG.maximus.defaultLogoUrl, count: appStats?.maximus ?? 0 },
    { id: "fusion", name: "Fusion", logo: MANAGED_APP_CATALOG.fusion.defaultLogoUrl, count: appStats?.ultra ?? 0 },
    { id: "prestige", name: "Prestige", logo: MANAGED_APP_CATALOG.prestige.defaultLogoUrl, count: appStats?.prestige ?? 0 },
    { id: "optimus", name: "Optimus", logo: MANAGED_APP_CATALOG.optimus.defaultLogoUrl, count: appStats?.optimus ?? 0 },
    { id: "imperio", name: "Império Play", logo: MANAGED_APP_CATALOG.imperio.defaultLogoUrl, count: appStats?.imperio ?? 0 },
    { id: "infinitus", name: "Infinitus", logo: MANAGED_APP_CATALOG.infinitus.defaultLogoUrl, count: appStats?.infinitus ?? 0 },
    { id: "supremus", name: "Supreme", logo: MANAGED_APP_CATALOG.supremus.defaultLogoUrl, count: appStats?.supremus ?? 0 },
    { id: "evolux", name: "Evolux", logo: MANAGED_APP_CATALOG.evolux.defaultLogoUrl, count: appStats?.evolux ?? 0 },
    { id: "ominus", name: "Ominus", logo: MANAGED_APP_CATALOG.ominus.defaultLogoUrl, count: appStats?.ominus ?? 0 },
    { id: "magnus", name: "Magnus", logo: MANAGED_APP_CATALOG.magnus.defaultLogoUrl, count: appStats?.magnus ?? 0 },
    { id: "excellence", name: "Excellence", logo: MANAGED_APP_CATALOG.excellence.defaultLogoUrl, count: appStats?.excellence ?? 0 },
    { id: "future", name: "Future", logo: MANAGED_APP_CATALOG.future.defaultLogoUrl, count: appStats?.future ?? 0 },
  ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")), [appStats]);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header com Logo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <img src="/manus-storage/ouropro_logo_8ef5f444.png" alt="OuroPro" className="h-12 w-12 object-contain" />
            <div>
                <h1 className="text-xl font-bold text-foreground"><span>Dashboard</span></h1>
              {user && (
                <p className="text-sm text-muted-foreground">
                  <span>{"ID: "}</span>
                  <span>{user.id}</span>
                  <span>{" · Bem-vindo, "}</span>
                  <span>{user.name?.split(" ")[0]}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {planInfo?.planValidade && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50">
                <CalendarDays className="w-3 h-3" />
                <span>{"Validade: "}</span>
                <span>{formatDate(planInfo.planValidade)}</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-700 bg-green-50">
              <Shield className="w-3 h-3" />
              <span>{"DEVICES: "}</span>
              <span>{(!planInfo?.limiteDevices || planInfo.limiteDevices >= 999999 || planInfo.plano === 'Ultra Master') ? 'Ilimitado' : planInfo.limiteDevices}</span>
            </Badge>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              <span>{"Backup completo"}</span>
            </Button>
            {user?.isOwner && <Button variant="outline" size="sm" onClick={handleLegacyExport}>
              <Download className="w-4 h-4 mr-1" />
              <span>{"Backup p/ painel antigo"}</span>
            </Button>}
            <Button variant="outline" size="sm" disabled={previewingImport} onClick={() => document.getElementById('importFile')?.click()}>
              <Upload className="w-4 h-4 mr-1" />
              <span>{"Importar"}</span>
            </Button>
            <input id="importFile" type="file" accept=".json" style={{display: 'none'}} onChange={handleImport} />
          </div>
        </div>

        <Dialog open={backupReminderOpen} onOpenChange={(open) => { if (!open) dismissBackupReminder(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Shield size={20} className="text-primary" /> Faça seu backup semanal</DialogTitle>
              <DialogDescription>
                Baixe uma cópia completa de usuários, MACs, listas, configurações e credenciais. Ela ajuda a restaurar o painel se ocorrer algum problema.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              As senhas são incluídas de forma protegida: após restaurar, as credenciais continuam funcionando sem serem exibidas em texto aberto.
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={dismissBackupReminder}>Lembrar na próxima semana</Button>
              <Button className="gap-2 text-black dark:text-white" onClick={downloadBackupFromReminder}><Download size={16} /> Baixar agora</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {importPreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"><CardHeader><CardTitle>Prévia segura da importação</CardTitle><p className="text-sm text-muted-foreground">Nada foi alterado ainda. Revise os MACs abaixo antes de confirmar.</p></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><PreviewMetric label="No arquivo" value={importPreview.summary.importedDevices} /><PreviewMetric label="Novos" value={importPreview.summary.newDevices} /><PreviewMetric label="Já existem" value={importPreview.summary.existingMatches} /><PreviewMetric label="Duplicados" value={importPreview.summary.duplicateInFile + importPreview.summary.invalidDevices} /></div>{importPreview.existingMatches.length > 0 && <PreviewList title="MACs já cadastrados — serão atualizados" rows={importPreview.existingMatches.map((row: any) => `${row.mac} · ${row.currentName}`)} />}{importPreview.duplicateInFile.length > 0 && <PreviewList title="MACs repetidos dentro do arquivo" rows={importPreview.duplicateInFile.map((row: any) => `${row.mac} · ${row.nomeServer}`)} danger />}{importPreview.invalidDevices.length > 0 && <PreviewList title="Registros inválidos — não serão importados" rows={importPreview.invalidDevices.map((row: any) => `${row.mac || 'sem MAC'} · ${row.nomeServer}`)} danger />}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => { setImportPreview(null); setPendingBackup(null); }}>Cancelar</Button><Button onClick={confirmImport} disabled={confirmingImport || !importPreview.valid} className="text-black dark:text-white">{confirmingImport ? 'Importando…' : 'Confirmar importação'}</Button></div>{!importPreview.valid && <p className="text-sm text-destructive">Corrija os registros inválidos no backup antes de importar.</p>}</CardContent></Card></div>}

        {/* Stats Cards */}
        {statsError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4" />
            <span>{"Erro ao carregar estatísticas."}</span>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard title="Total de Usuários" value={stats?.total ?? 0} icon={Users} color="bg-blue-500" />
              <StatCard title="Total de Revendas" value={stats?.revendas ?? 0} icon={Layers} color="bg-purple-500" />
              <StatCard title="Ultra Masters" value={stats?.ultraMasters ?? 0} icon={Crown} color="bg-orange-500" />
              <StatCard title="Total de Masters" value={stats?.masters ?? 0} icon={Star} color="bg-green-500" />
              <StatCard title="Receita Mensal" value={formatCurrency(stats?.receitaMensal ?? 0)} icon={Shield} color="bg-emerald-500" />
            </>
          )}
        </div>

        {user?.isOwner && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Fechamento mensal</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Confira o mês anterior antes do início do novo mês. O histórico não apaga clientes nem listas.</p>
                </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setMonthlyClosureOpen(true)} disabled={!monthlyPreview} className="gap-2">
                      <CalendarDays className="h-4 w-4" /> Ver fechamento
                    </Button>
                    <Button variant="outline" onClick={() => scheduleStatus.data?.enabled ? disableMonthlySchedule.mutate() : enableMonthlySchedule.mutate()} disabled={enableMonthlySchedule.isPending || disableMonthlySchedule.isPending} className="gap-2">
                      {scheduleStatus.data?.enabled ? "Desativar automático" : "Ativar automático"}
                    </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><p className="text-muted-foreground">Mês anterior</p><p className="font-semibold">{monthlyPreview?.report.periodStart?.slice(0, 7) ?? "—"}</p></div>
              <div><p className="text-muted-foreground">Receita</p><p className="font-semibold text-emerald-600">{formatCurrency(monthlyPreview?.report.revenue ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Clientes no mês</p><p className="font-semibold">{monthlyPreview?.report.newClientCount ?? 0}</p></div>
              <div><p className="text-muted-foreground">Playlists</p><p className="font-semibold">{monthlyPreview?.report.playlistCount ?? 0}</p></div>
            </CardContent>
          </Card>
        )}

        <Dialog open={monthlyClosureOpen} onOpenChange={setMonthlyClosureOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fechamento mensal — {monthlyPreview?.report.periodStart?.slice(0, 7) ?? "mês anterior"}</DialogTitle>
              <DialogDescription>Resumo salvo antes do zeramento da Receita Mensal. Os cadastros permanecem no painel.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard title="Receita total" value={formatCurrency(monthlyPreview?.report.revenue ?? 0)} icon={Shield} color="bg-emerald-500" />
              <StatCard title="Clientes no mês" value={monthlyPreview?.report.newClientCount ?? 0} icon={Users} color="bg-blue-500" />
              <StatCard title="Playlists" value={monthlyPreview?.report.playlistCount ?? 0} icon={Layers} color="bg-purple-500" />
              <StatCard title="Receita clientes" value={formatCurrency(monthlyPreview?.report.deviceRevenue ?? 0)} icon={Users} color="bg-cyan-500" />
              <StatCard title="Receita servidores" value={formatCurrency(monthlyPreview?.report.serverRevenue ?? 0)} icon={Layers} color="bg-orange-500" />
              <StatCard title="Servidores pagos" value={monthlyPreview?.report.paidServerCount ?? 0} icon={Shield} color="bg-green-500" />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="outline" onClick={downloadMonthlyClosure} className="gap-2"><Download className="h-4 w-4" /> Baixar relatório</Button>
              <Button variant="outline" onClick={copyMonthlyWhatsApp} className="gap-2"><Upload className="h-4 w-4" /> Copiar para WhatsApp</Button>
              <Button onClick={() => closeMonthly.mutate()} disabled={closeMonthly.isPending || Boolean(monthlyPreview?.saved)} className="gap-2"><Shield className="h-4 w-4" /> {monthlyPreview?.saved ? "Fechamento salvo" : closeMonthly.isPending ? "Salvando..." : "Salvar fechamento"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dispositivos Conectados ─── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-sm font-semibold">
                  <span>{"Dispositivos Conectados"}</span>
                </CardTitle>
                {!connectedLoading && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200" variant="outline">
                    <Activity className="w-3 h-3 mr-1" />
                    <span>{connectedDevices?.length ?? 0}</span>
                    <span>{" em exibição"}</span>
                  </Badge>
                )}
              </div>
              <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                <Button
                  size="sm"
                  variant={connectedFilter === "online" ? "default" : "outline"}
                  className={`h-7 px-2.5 text-xs font-semibold transition-colors ${
                    connectedFilter === "online"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      : "text-foreground dark:text-foreground"
                  }`}
                  onClick={() => setConnectedFilter("online")}
                  aria-pressed={connectedFilter === "online"}
                  title="Mostrar somente dispositivos online agora"
                >
                  <Wifi className="mr-1.5 h-3.5 w-3.5" />
                  <span>Online agora</span>
                </Button>
                <span className="text-xs text-muted-foreground">{"Últimos:"}</span>
                {[15, 30, 60, 120].map(m => (
                  <Button
                    key={m}
                    size="sm"
                    variant={connectedFilter === m ? "default" : "outline"}
                    className={`h-7 px-2.5 text-xs font-semibold transition-colors ${
                      connectedFilter === m
                        ? "dark:bg-amber-500 dark:text-white dark:hover:bg-amber-500"
                        : "text-foreground dark:text-foreground"
                    }`}
                    onClick={() => setConnectedFilter(m)}
                  >
                    <span>{m < 60 ? `${m}min` : `${m / 60}h`}</span>
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={connectedLoading || connectedRefreshing}
                  onClick={() => void refetchConnected()}
                  title={connectedRefreshing ? "Atualizando dispositivos conectados" : "Atualizar"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connectedRefreshing ? "animate-spin text-primary" : ""}`} />
                  <span className="sr-only">{connectedRefreshing ? "Atualizando" : "Atualizar"}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {connectedLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (connectedDevices ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <WifiOff className="w-8 h-8 opacity-30" />
                <p className="text-sm">
                  <span>{"Nenhum dispositivo conectado nos últimos "}</span>
                  <span>{connectedFilter === "online" ? "agora" : "as últimas 2 horas"}</span>
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs"><span>{"STATUS"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"MAC"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"NOME DO SERVER"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"APLICATIVO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"TIPO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"ASSISTINDO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"FORÇAR CANAL"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"ÚLTIMA CONEXÃO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"EXPIRA EM"}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(connectedDevices ?? []).map(d => {
                    const isRecent = isWithinConnectedWindow(d.lastSeen);
                    const isFixed = d.forceShowChannel === true;
                    const activeApp = d.lastActiveAppId && d.lastActiveAppId in MANAGED_APP_CATALOG
                      ? MANAGED_APP_CATALOG[d.lastActiveAppId as keyof typeof MANAGED_APP_CATALOG].displayName
                      : d.app;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isRecent ? (
                              <Wifi className="w-3 h-3 text-green-500" />
                            ) : isFixed ? (
                              <Wifi className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Wifi className="w-3 h-3 text-amber-400" />
                            )}
                            <span className={`text-xs font-medium ${isRecent ? "text-green-600" : isFixed ? "text-blue-600" : "text-amber-600"}`}>
                              {isRecent ? "Online" : isFixed ? "Fixado" : "Recente"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                        <TableCell className="text-xs"><span>{d.nomeServer}</span></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs"><span>{activeApp || "—"}</span></Badge></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs"><span>{d.tipo}</span></Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px]">
                          <div className="flex items-center gap-1 group">
                            {d.currentContent ? (
                              <span className={`flex items-center gap-1 font-medium truncate flex-1 ${isRecent ? "text-green-600 dark:text-green-400" : isFixed ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} title={d.currentContent}>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRecent ? "bg-green-500 animate-pulse" : isFixed ? "bg-blue-500" : "bg-muted-foreground"}`} />
                                <span className="truncate">{d.currentContent}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground flex-1">—</span>
                            )}
                            <EditCurrentContentButton deviceId={d.id} currentContent={d.currentContent} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <ForceShowChannelToggle deviceId={d.id} forceShowChannel={d.forceShowChannel ?? false} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span>{formatLastSeen(d.lastSeen)}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={d.dataExpiracao && new Date(d.dataExpiracao) < new Date() ? "text-red-500" : "text-foreground"}>
                            {formatDate(d.dataExpiracao)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Plan Info Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold"><span>{"Informações do meu plano"}</span></CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold"><span>{"Nome"}</span></TableHead>
                  <TableHead className="text-xs font-semibold"><span>{"Informação"}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Meu Plano"}</span></TableCell>
                  <TableCell className="text-sm text-primary font-medium"><span>{planInfo?.plano ?? "Revenda"}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Data do vencimento"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{formatDate(planInfo?.planValidade)}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{(!planInfo?.limiteDevices || planInfo.limiteDevices >= 999999 || planInfo.plano === 'Ultra Master') ? 'Ilimitado' : planInfo.limiteDevices}</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm font-medium"><span>{"Limite Restante de Cadastro Device"}</span></TableCell>
                  <TableCell className="text-sm text-primary"><span>{(!planInfo?.limiteDevices || planInfo.limiteDevices >= 999999 || planInfo.plano === 'Ultra Master') ? 'Ilimitado' : Math.max(0, planInfo.limiteDevices - (stats?.total ?? 0))}</span></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Últimos Usuários Cadastrados */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold"><span>{"Últimos Usuários Cadastrados"}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" variant="default" className="h-8 px-3 text-xs">
                <Search className="w-3 h-3 mr-1" />
                <span>{"Buscar"}</span>
              </Button>
            </div>
            {recentLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs"><span>{"MAC"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"NOME DO SERVER"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"TIPO"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"STATUS"}</span></TableHead>
                    <TableHead className="text-xs"><span>{"DATA DE CADASTRO"}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentDevices ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        <span>{"Nenhum usuário cadastrado ainda."}</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (recentDevices ?? []).map(d => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                        <TableCell className="text-xs"><span>{d.nomeServer}</span></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs"><span>{d.tipo}</span></Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${d.status === "Liberado" ? "bg-green-100 text-green-700 border-green-200" : d.status === "Expirado" ? "bg-red-100 text-red-700 border-red-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}
                            variant="outline"
                          >
                            <span>{d.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs"><span>{formatDate(d.dataCadastro)}</span></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      {/* Expirando em breve */}
      {(expiringSoon ?? []).length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
              <span>{`⚠️ Expirando nos próximos 7 dias (${(expiringSoon ?? []).length})`}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs"><span>{"MAC"}</span></TableHead>
                  <TableHead className="text-xs"><span>{"NOME DO SERVER"}</span></TableHead>
                  <TableHead className="text-xs"><span>{"EXPIRA EM"}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expiringSoon ?? []).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                    <TableCell className="text-xs"><span>{d.nomeServer}</span></TableCell>
                    <TableCell className="text-xs text-orange-600 font-medium">
                      <span>{formatDate(d.dataExpiracao)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4 text-amber-500" /> Ranking global de aplicativos
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Cadastros somados entre você e todas as revendas.</p>
          </div>
          <Link href="/ranking-apps" className="shrink-0 text-xs font-semibold text-primary hover:underline">Ver completo</Link>
        </CardHeader>
        <CardContent>
          {miniRanking.some((app) => app.count > 0) ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {miniRanking.slice(0, 5).map((app, index) => (
                <div key={app.id} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">#{index + 1}</span>
                  <img src={app.logo} alt="" className="h-8 w-8 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.count} {app.count === 1 ? "cadastro" : "cadastros"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum aplicativo possui cadastro ainda.</p>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border p-3"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function PreviewList({ title, rows, danger = false }: { title: string; rows: string[]; danger?: boolean }) {
  return <div className={`rounded-lg border p-3 ${danger ? "border-amber-500/40" : ""}`}><p className="mb-2 text-sm font-medium">{title}</p><div className="space-y-1 text-xs text-muted-foreground">{rows.map((row, index) => <p key={`${row}-${index}`}>{row}</p>)}</div></div>;
}
