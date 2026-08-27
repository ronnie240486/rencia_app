import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, ChevronDown, List, Pencil, Plus, Search, Trash2, Globe,
  LockKeyhole, SlidersHorizontal, UnlockKeyhole, Download, Mic, MicOff,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { formatDateOnlyPtBr } from "@shared/dateOnly";
import { downloadCsv } from "@/lib/csv";
import { normalizeVoiceSearchTranscript } from "@/lib/voiceSearch";

const PAGE_SIZE = 50;

type DeviceStatus = "Liberado" | "Bloqueado" | "Expirado";
type DeviceTipo = "Usuario" | "Revenda" | "UltraMaster" | "Master";

type VoiceRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
};

type VoiceRecognitionConstructor = new () => VoiceRecognition;

function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, string> = {
    Liberado: "bg-green-100 text-green-700 border-green-200",
    Bloqueado: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Expirado: "bg-red-100 text-red-700 border-red-200",
  };
  return <Badge variant="outline" className={`text-xs ${map[status] ?? ""}`}>{status}</Badge>;
}

function TipoBadge({ tipo }: { tipo: DeviceTipo }) {
  const map: Record<DeviceTipo, string> = {
    Usuario: "bg-gray-100 text-gray-700 border-gray-200",
    Revenda: "bg-blue-100 text-blue-700 border-blue-200",
    UltraMaster: "bg-purple-100 text-purple-700 border-purple-200",
    Master: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <Badge variant="outline" className={`text-xs ${map[tipo] ?? ""}`}>
      {tipo === "UltraMaster" ? "Ultra Master" : tipo}
    </Badge>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteManyOpen, setDeleteManyOpen] = useState(false);
  const [deleteExpiredOpen, setDeleteExpiredOpen] = useState(false);

  // DNS em massa
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false);
  const [dnsDialogScope, setDnsDialogScope] = useState<"selected" | "all">("selected");
  const [newDnsUrl, setNewDnsUrl] = useState("");
  const [bulkConfigOpen, setBulkConfigOpen] = useState(false);
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"" | DeviceStatus>("");
  const [bulkApp, setBulkApp] = useState("");
  const [bulkExpiration, setBulkExpiration] = useState("");
  const [bulkUrl, setBulkUrl] = useState("");
  const [isListening, setIsListening] = useState(false);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.devices.list.useQuery({ search, page, pageSize: PAGE_SIZE });
  const exportClientsQuery = trpc.dataExports.clients.useQuery({ search }, { enabled: false });
  const devices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = trpc.devices.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário deletado com sucesso.");
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteManyMutation = trpc.devices.deleteMany.useMutation({
    onSuccess: () => {
      toast.success(`${selected.size} usuário(s) deletado(s).`);
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      setSelected(new Set());
      setDeleteManyOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteExpiredMutation = trpc.devices.deleteExpired.useMutation({
    onSuccess: () => {
      toast.success("Usuários expirados deletados.");
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      setDeleteExpiredOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDnsMutation = trpc.devices.bulkUpdateDns.useMutation({
    onSuccess: () => {
      const scope = dnsDialogScope === "all" ? "todos os usuários" : `${selected.size} usuário(s)`;
      toast.success(`✅ DNS atualizado para ${scope}!`);
      utils.devices.list.invalidate();
      setDnsDialogOpen(false);
      setNewDnsUrl("");
    },
    onError: (e) => toast.error(e.message),
  });

  const invalidateDeviceData = async () => {
    await Promise.all([
      utils.devices.list.invalidate(),
      utils.devices.stats.invalidate(),
      utils.connected.list.invalidate(),
      utils.superPanel.overview.invalidate(),
      utils.superPanel.diagnostics.invalidate(),
    ]);
  };

  const updateStatusMutation = trpc.devices.update.useMutation({
    onSuccess: async () => {
      await invalidateDeviceData();
      toast.success("Status do cliente atualizado.");
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdateMutation = trpc.devices.bulkUpdate.useMutation({
    onSuccess: async (result) => {
      await invalidateDeviceData();
      toast.success(`${result.count} cliente(s) atualizado(s).`);
      setSelected(new Set());
      setBulkConfigOpen(false);
      setBulkReviewOpen(false);
      setBulkStatus("");
      setBulkApp("");
      setBulkExpiration("");
      setBulkUrl("");
    },
    onError: (e) => toast.error(e.message),
  });

  const formatDate = (d: Date | string | null | undefined) => {
    return formatDateOnlyPtBr(d);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelected(new Set());
  };

  const startVoiceSearch = () => {
    const speechWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: VoiceRecognitionConstructor;
      webkitSpeechRecognition?: VoiceRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("A busca por voz não é suportada neste navegador. Use o Chrome atualizado ou digite a busca.");
      return;
    }

    voiceRecognitionRef.current?.abort();
    const recognition = new Recognition();
    voiceRecognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      voiceRecognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") toast.error(event.error === "not-allowed" ? "Libere o microfone para usar a busca por voz." : "Não foi possível entender a busca. Tente novamente.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const term = normalizeVoiceSearchTranscript(transcript);
      if (!term) return toast.error("Não foi possível identificar a busca falada.");
      setSearchInput(term);
      setSearch(term);
      setPage(1);
      setSelected(new Set());
      toast.success(`Buscando por: ${term}`);
    };
    recognition.start();
  };

  const exportClients = async () => {
    const result = await exportClientsQuery.refetch();
    if (!result.data) return toast.error("Não foi possível exportar os clientes.");
    downloadCsv("clientes-filtrados.csv", ["Nome", "MAC", "Aplicativo", "Versão", "Telefone", "Valor", "Status", "Cadastro", "Vencimento"], result.data.map((device) => [device.nomeServer, device.mac, device.app, device.appVersion, device.telefone, device.valor, device.status, formatDate(device.dataCadastro), formatDate(device.dataExpiracao)]));
    toast.success(`${result.data.length} cliente(s) exportado(s).`);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = devices.length > 0 && devices.every(d => selected.has(d.id));
  const someOnPageSelected = devices.some(d => selected.has(d.id)) && !allOnPageSelected;

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        devices.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        devices.forEach(d => next.add(d.id));
        return next;
      });
    }
  };

  const openDnsDialog = (scope: "selected" | "all") => {
    setDnsDialogScope(scope);
    setNewDnsUrl("");
    setDnsDialogOpen(true);
  };

  const handleDnsSubmit = () => {
    if (!newDnsUrl.trim()) { toast.error("Informe a nova URL M3U8."); return; }
    bulkDnsMutation.mutate({
      newUrl: newDnsUrl.trim(),
      ids: dnsDialogScope === "selected" ? Array.from(selected) : undefined,
    });
  };

  const openBulkConfig = () => {
    if (selected.size === 0) return toast.error("Selecione pelo menos um cliente.");
    setBulkStatus("");
    setBulkApp("");
    setBulkExpiration("");
    setBulkUrl("");
    setBulkConfigOpen(true);
  };

  const handleBulkConfigSubmit = () => {
    if (!bulkStatus && !bulkApp && !bulkExpiration && !bulkUrl) {
      toast.error("Escolha pelo menos uma configuração para alterar.");
      return;
    }
    setBulkReviewOpen(true);
  };

  const confirmBulkConfigSubmit = () => {
    bulkUpdateMutation.mutate({
      ids: Array.from(selected),
      status: bulkStatus || undefined,
      app: bulkApp || undefined,
      dataExpiracao: bulkExpiration || undefined,
      urlM3u8: bulkUrl || undefined,
    });
  };

  const bulkChanges = [
    ["Status", bulkStatus],
    ["Aplicativo", bulkApp],
    ["Vencimento", bulkExpiration ? formatDate(bulkExpiration) : ""],
    ["Lista / DNS principal", bulkUrl],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground">Lista de Usuários</h1>
          <div className="flex gap-2 flex-wrap">
            <Link href="/users/create">
              <Button size="sm" className="h-8 text-xs gap-1 btn-add-user">
                <Plus className="w-3 h-3" />
                Cadastrar Novo
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportClients} disabled={exportClientsQuery.isFetching}>
              <Download className="w-3 h-3" /> CSV
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1"
              onClick={() => setDeleteExpiredOpen(true)}
            >
              <Trash2 className="w-3 h-3" />
              Deletar Expirados
            </Button>
          </div>
        </div>

        {/* Search + Bulk Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Buscar por nome, MAC ou telefone..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="h-8 text-sm max-w-xs"
          />
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1" onClick={startVoiceSearch} disabled={isListening} aria-label="Buscar por voz" title="Buscar por voz">
            {isListening ? <MicOff className="w-3 h-3 animate-pulse" /> : <Mic className="w-3 h-3" />}
            {isListening ? "Ouvindo..." : "Voz"}
          </Button>
          <Button size="sm" className="h-8 px-3 text-xs btn-search" onClick={handleSearch}>
            <Search className="w-3 h-3 mr-1" />
            Buscar
          </Button>
          {selected.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100">
                  {selected.size} selecionado(s)
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer text-blue-700"
                  onClick={() => openDnsDialog("selected")}
                >
                  <Globe className="w-3 h-3 mr-2" />
                  Trocar DNS dos selecionados
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={openBulkConfig}>
                  <SlidersHorizontal className="w-3 h-3 mr-2" />
                  Configurar selecionados
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-amber-700" onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selected), status: "Bloqueado" })}>
                  <LockKeyhole className="w-3 h-3 mr-2" />
                  Bloquear selecionados
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-emerald-700" onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selected), status: "Liberado" })}>
                  <UnlockKeyhole className="w-3 h-3 mr-2" />
                  Liberar selecionados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => setDeleteManyOpen(true)}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Deletar selecionados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Lista otimizada para celular */}
        <div className="space-y-3 md:hidden">
          {isLoading ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36 w-full rounded-xl" />) : devices.length === 0 ? <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div> : devices.map((device) => (
            <div key={device.id} className={`rounded-2xl border bg-card p-4 shadow-sm ${selected.has(device.id) ? "border-primary bg-primary/5" : "border-primary/15"}`}>
              <div className="flex items-start gap-3">
                <Checkbox checked={selected.has(device.id)} onCheckedChange={() => toggleSelect(device.id)} aria-label={`Selecionar ${device.mac}`} className="mt-1" />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">{device.nomeServer.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Cliente</p><p className="truncate font-semibold text-foreground">{device.nomeServer}</p></div><StatusBadge status={device.status as DeviceStatus} /></div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{device.mac}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-y py-3">
                <div className="rounded-xl bg-primary/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Playlists</p><p className="mt-0.5 text-lg font-bold text-primary">{device.playlistCount}</p></div>
                <div className="rounded-xl bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Nível</p><p className="mt-0.5 truncate text-sm font-semibold text-foreground">{device.tipo}</p></div>
                <div className="rounded-xl bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Valor</p><p className="mt-0.5 text-sm font-semibold text-foreground">{device.valor ? `R$ ${Number(device.valor).toFixed(2)}` : "—"}</p></div>
                <div className="rounded-xl bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Aplicativo</p><p className="mt-0.5 truncate text-sm font-semibold text-foreground">{device.app || "Não informado"}</p></div>
                <div className="rounded-xl bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cadastro</p><p className="mt-0.5 text-sm font-semibold text-foreground">{formatDate(device.dataCadastro)}</p></div>
                <div className="rounded-xl bg-muted/60 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Expiração</p><p className="mt-0.5 text-sm font-semibold text-foreground">{formatDate(device.dataExpiracao)}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3">
                <Link href={`/cliente/${device.id}`}><Button size="sm" variant="outline" className="w-full gap-1">360°</Button></Link>
                <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setDeleteId(device.id)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
                <Button size="sm" variant="outline" className="w-full gap-1" disabled={updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate({ id: device.id, status: device.status === "Bloqueado" ? "Liberado" : "Bloqueado" })}>{device.status === "Bloqueado" ? <UnlockKeyhole className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}{device.status === "Bloqueado" ? "Liberar" : "Bloquear"}</Button>
                <Link href={`/users/${device.id}/edit`}><Button size="sm" variant="outline" className="w-full gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</Button></Link>
              </div>
            </div>
          ))}
        </div>

        {/* Tabela detalhada para telas médias e grandes */}
        <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      data-state={someOnPageSelected ? "indeterminate" : allOnPageSelected ? "checked" : "unchecked"}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">MAC</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">NOME DO SERVER</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">TIPO</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">VALOR</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">STATUS</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">CADASTRO</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">EXPIRAÇÃO</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-12">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map(d => (
                    <TableRow
                      key={d.id}
                      className={selected.has(d.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(d.id)}
                          onCheckedChange={() => toggleSelect(d.id)}
                          aria-label={`Selecionar ${d.mac}`}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{d.mac}</TableCell>
                      <TableCell className="text-xs font-medium">{d.nomeServer}</TableCell>
                      <TableCell><TipoBadge tipo={d.tipo as DeviceTipo} /></TableCell>
                      <TableCell className="text-xs">
                        {d.valor ? `R$ ${Number(d.valor).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={d.status as DeviceStatus} /></TableCell>
                      <TableCell className="text-xs">{formatDate(d.dataCadastro)}</TableCell>
                      <TableCell className="text-xs">{formatDate(d.dataExpiracao)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/cliente/${d.id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" title="Ficha 360°">
                              360°
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            title="Deletar"
                            onClick={() => setDeleteId(d.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            title={d.status === "Bloqueado" ? "Liberar cliente" : "Bloquear cliente"}
                            onClick={() => updateStatusMutation.mutate({ id: d.id, status: d.status === "Bloqueado" ? "Liberado" : "Bloqueado" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            {d.status === "Bloqueado" ? <UnlockKeyhole className="w-3 h-3" /> : <LockKeyhole className="w-3 h-3" />}
                          </Button>
                          <Link href={`/users/${d.id}/edit`}>
                            <Button size="sm" className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600" title="Editar">
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={page <= 1}
            onClick={() => { setPage(p => p - 1); setSelected(new Set()); }}
          >
            <ChevronLeft className="w-3 h-3" />
            Anterior
          </Button>
          <span>Página {page} de {totalPages} ({total} total)</span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={page >= totalPages}
            onClick={() => { setPage(p => p + 1); setSelected(new Set()); }}
          >
            Próxima
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* DNS em Massa Dialog */}
      <Dialog open={dnsDialogOpen} onOpenChange={open => { if (!open) setDnsDialogOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              {dnsDialogScope === "all" ? "Trocar DNS de Todos os Usuários" : `Trocar DNS de ${selected.size} Usuário(s)`}
            </DialogTitle>
            <DialogDescription>
              {dnsDialogScope === "all"
                ? "A nova URL M3U8 será aplicada a TODOS os seus usuários cadastrados. Esta ação não pode ser desfeita."
                : `A nova URL M3U8 será aplicada aos ${selected.size} usuário(s) selecionados.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nova URL M3U8: <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="http://servidor.com:porta/get.php?username=...&password=...&type=m3u_plus"
                value={newDnsUrl}
                onChange={e => setNewDnsUrl(e.target.value)}
                className="h-10 font-mono text-xs"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL completa do servidor M3U8 (incluindo usuário e senha).
              </p>
            </div>
            {dnsDialogScope === "all" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ Atenção: Esta ação irá sobrescrever a URL M3U8 de <strong>todos</strong> os seus usuários.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDnsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDnsSubmit}
              disabled={bulkDnsMutation.isPending || !newDnsUrl.trim()}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Globe className="w-4 h-4" />
              {bulkDnsMutation.isPending ? "Aplicando..." : "Aplicar DNS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuração em Massa */}
      <Dialog open={bulkConfigOpen} onOpenChange={setBulkConfigOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-primary" /> Configurar {selected.size} cliente(s)</DialogTitle>
            <DialogDescription>Preencha apenas os campos que deseja alterar. Os demais dados dos clientes serão preservados.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as "" | DeviceStatus)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Não alterar</option>
                <option value="Liberado">Liberado</option>
                <option value="Bloqueado">Bloqueado</option>
                <option value="Expirado">Expirado</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Aplicativo</Label>
              <select value={bulkApp} onChange={e => setBulkApp(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Não alterar</option>
                <option value="OuroPro">Ouro Pro</option>
                <option value="Maximus Player">Maximus Player</option>
                <option value="Ultra Player">Fusion</option>
                <option value="Prestige">Prestige</option>
                <option value="Optimus">Optimus</option>
                <option value="Império Play">Império Play</option>
                <option value="Infinitus">Infinitus</option>
                <option value="Supremus">Supreme</option>
                <option value="Evolux">Evolux</option>
                <option value="Ominus">Ominus</option>
                <option value="Magnus">Magnus</option>
                <option value="Excellence">Excellence</option>
                <option value="Outro">Outro aplicativo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nova data de vencimento</Label>
              <Input type="date" value={bulkExpiration} onChange={e => setBulkExpiration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nova DNS / lista principal</Label>
              <Input placeholder="https://servidor.com/lista" value={bulkUrl} onChange={e => setBulkUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkConfigSubmit} disabled={bulkUpdateMutation.isPending} className="gap-2 text-black dark:text-white">
              <SlidersHorizontal className="w-4 h-4" /> Revisar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkReviewOpen} onOpenChange={setBulkReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar edição em massa</DialogTitle>
            <DialogDescription>
              As alterações abaixo serão aplicadas somente aos {selected.size} cliente(s) selecionado(s). Os demais dados serão preservados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
            {bulkChanges.map(([label, value]) => (
              <div key={label} className="flex gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
                <span className="min-w-0 break-all font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkReviewOpen(false)} disabled={bulkUpdateMutation.isPending}>Voltar</Button>
            <Button onClick={confirmBulkConfigSubmit} disabled={bulkUpdateMutation.isPending} className="gap-2 text-black dark:text-white">
              <SlidersHorizontal className="w-4 h-4" /> {bulkUpdateMutation.isPending ? "Aplicando..." : "Confirmar e aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteId !== null) deleteMutation.mutate({ id: deleteId }); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Many Confirm */}
      <Dialog open={deleteManyOpen} onOpenChange={open => { if (!open) setDeleteManyOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar {selected.size} usuário(s)</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteManyOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteManyMutation.mutate({ ids: Array.from(selected) })}
              disabled={deleteManyMutation.isPending}
            >
              {deleteManyMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expired Confirm */}
      <Dialog open={deleteExpiredOpen} onOpenChange={open => { if (!open) setDeleteExpiredOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar usuários expirados</DialogTitle>
            <DialogDescription>
              Todos os usuários com data de expiração passada serão removidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExpiredOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteExpiredMutation.mutate()}
              disabled={deleteExpiredMutation.isPending}
            >
              {deleteExpiredMutation.isPending ? "Deletando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
