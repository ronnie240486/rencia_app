import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, ChevronDown, Pencil, Plus, Search, Trash2,
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
  return <Badge variant="outline" className={`text-xs ${map[status]}`}><span>{status}</span></Badge>;
}

function TipoBadge({ tipo }: { tipo: DeviceTipo }) {
  const map: Record<DeviceTipo, string> = {
    Usuario: "bg-gray-100 text-gray-700 border-gray-200",
    Revenda: "bg-blue-100 text-blue-700 border-blue-200",
    UltraMaster: "bg-purple-100 text-purple-700 border-purple-200",
    Master: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <Badge variant="outline" className={`text-xs ${map[tipo]}`}>
      <span>{tipo === "UltraMaster" ? "Ultra Master" : tipo}</span>
    </Badge>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteManyOpen, setDeleteManyOpen] = useState(false);
  const [deleteExpiredOpen, setDeleteExpiredOpen] = useState(false);

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
      toast.success(`${selected.length} usuário(s) deletado(s).`);
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      setSelected([]);
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

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelected([]);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === devices.length) setSelected([]);
    else setSelected(devices.map(d => d.id));
  };

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-foreground"><span>{"Lista de Usuários"}</span></h1>
          <div className="flex gap-2">
            <Link href="/users/create">
              <Button size="sm" className="h-8 text-xs gap-1">
                <Plus className="w-3 h-3" />
                <span>{"Cadastrar Novo"}</span>
              </Button>
            </Link>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1"
              onClick={() => setDeleteExpiredOpen(true)}
            >
              <Trash2 className="w-3 h-3" />
              <span>{"Deletar Usuários Expirados"}</span>
            </Button>
          </div>
        </div>

        {/* Search + Bulk Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Buscar..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="h-8 text-sm max-w-xs"
          />
          <Button size="sm" variant="default" className="h-8 px-3 text-xs" onClick={handleSearch}>
            <Search className="w-3 h-3 mr-1" />
            <span>{"Buscar"}</span>
          </Button>
          {selected.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  <span>{"Ações em massa ("}</span>
                  <span>{selected.length}</span>
                  <span>{")"}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteManyOpen(true)}>
                  <Trash2 className="w-3 h-3 mr-2" />
                  <span>{"Deletar selecionados"}</span>
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
                      checked={devices.length > 0 && selected.length === devices.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"MAC"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"NOME DO SERVER"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"TIPO"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"VALOR"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"STATUS"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"DATA DE CADASTRO"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider"><span>{"DATA DE EXPIRAÇÃO"}</span></TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right"><span>{"AÇÕES"}</span></TableHead>
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
                      <span>{"Nenhum usuário encontrado."}</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map(d => (
                    <TableRow key={d.id} className={selected.includes(d.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(d.id)}
                          onCheckedChange={() => toggleSelect(d.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono"><span>{d.mac}</span></TableCell>
                      <TableCell className="text-xs font-medium"><span>{d.nomeServer}</span></TableCell>
                      <TableCell><TipoBadge tipo={d.tipo} /></TableCell>
                      <TableCell className="text-xs">
                        <span>{d.valor ? `R$ ${Number(d.valor).toFixed(2)}` : "—"}</span>
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs"><span>{formatDate(d.dataCadastro)}</span></TableCell>
                      <TableCell className="text-xs"><span>{formatDate(d.dataExpiracao)}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0"
                            onClick={() => setDeleteId(d.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Link href={`/users/${d.id}/edit`}>
                            <Button size="sm" className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600">
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
            onClick={() => { setPage(p => p - 1); setSelected([]); }}
          >
            <ChevronLeft className="w-3 h-3" />
            <span>{"Anterior"}</span>
          </Button>
          <span>
            <span>{"Página "}</span>
            <span>{page}</span>
            <span>{" de "}</span>
            <span>{totalPages}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            disabled={page >= totalPages}
            onClick={() => { setPage(p => p + 1); setSelected([]); }}
          >
            <span>{"Próxima"}</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Delete Single Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>{"Confirmar exclusão"}</span></DialogTitle>
            <DialogDescription>
              <span>{"Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita."}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              <span>{"Cancelar"}</span>
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              <span>{deleteMutation.isPending ? "Deletando..." : "Deletar"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Many Confirm */}
      <Dialog open={deleteManyOpen} onOpenChange={setDeleteManyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span>{"Deletar "}</span>
              <span>{selected.length}</span>
              <span>{" usuário(s)"}</span>
            </DialogTitle>
            <DialogDescription>
              <span>{"Esta ação não pode ser desfeita. Deseja continuar?"}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteManyOpen(false)}>
              <span>{"Cancelar"}</span>
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteManyMutation.mutate({ ids: selected })}
              disabled={deleteManyMutation.isPending}
            >
              <span>{deleteManyMutation.isPending ? "Deletando..." : "Deletar"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expired Confirm */}
      <Dialog open={deleteExpiredOpen} onOpenChange={setDeleteExpiredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><span>{"Deletar usuários expirados"}</span></DialogTitle>
            <DialogDescription>
              <span>{"Todos os usuários com data de expiração passada serão removidos. Esta ação não pode ser desfeita."}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExpiredOpen(false)}>
              <span>{"Cancelar"}</span>
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteExpiredMutation.mutate()}
              disabled={deleteExpiredMutation.isPending}
            >
              <span>{deleteExpiredMutation.isPending ? "Deletando..." : "Confirmar"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
