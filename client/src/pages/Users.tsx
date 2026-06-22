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
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const PAGE_SIZE = 50;

type DeviceStatus = "Liberado" | "Bloqueado" | "Expirado";
type DeviceTipo = "Usuario" | "Revenda" | "UltraMaster" | "Master";

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

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.devices.list.useQuery({ search, page, pageSize: PAGE_SIZE });
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

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelected(new Set());
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
            placeholder="Buscar por MAC ou servidor..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="h-8 text-sm max-w-xs"
          />
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

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0"
                            title="Deletar"
                            onClick={() => setDeleteId(d.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Link href={`/users/${d.id}/edit`}>
                            <Button size="sm" className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600" title="Editar">
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Link href={`/users/${d.id}/lists`}>
                            <Button size="sm" className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600" title="Gerenciar Listas">
                              <List className="w-3 h-3" />
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
