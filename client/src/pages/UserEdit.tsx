import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function UserEdit() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const deviceId = parseInt(params.id ?? "0", 10);

  const { data: appsData } = trpc.apps.list.useQuery();
  const { data: device, isLoading, error } = trpc.devices.getById.useQuery(
    { id: deviceId },
    { enabled: !isNaN(deviceId) && deviceId > 0 }
  );

  const [form, setForm] = useState({
    modoSelecao: "XTeamCode" as "XTeamCode" | "M3U8",
    mac: "",
    nomeServer: "",
    urlM3u8: "",
    app: "",
    urlEpg: "",
    valor: "",
    dataExpiracao: "",
    tipo: "Usuario" as "Usuario" | "Revenda" | "UltraMaster" | "Master",
    status: "Liberado" as "Liberado" | "Bloqueado" | "Expirado",
  });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (device && !initialized) {
      setForm({
        modoSelecao: device.modoSelecao as "XTeamCode" | "M3U8",
        mac: device.mac ?? "",
        nomeServer: device.nomeServer ?? "",
        urlM3u8: device.urlM3u8 ?? "",
        app: device.app ?? "",
        urlEpg: device.urlEpg ?? "",
        valor: device.valor ? String(device.valor) : "",
        dataExpiracao: device.dataExpiracao
          ? new Date(device.dataExpiracao).toISOString().split("T")[0]
          : "",
        tipo: device.tipo as "Usuario" | "Revenda" | "UltraMaster" | "Master",
        status: device.status as "Liberado" | "Bloqueado" | "Expirado",
      });
      setInitialized(true);
    }
  }, [device, initialized]);

  const utils = trpc.useUtils();

  const updateMutation = trpc.devices.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.devices.list.invalidate();
      utils.devices.stats.invalidate();
      navigate("/users");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mac.trim()) { toast.error("MAC do dispositivo é obrigatório."); return; }
    if (!form.nomeServer.trim()) { toast.error("Nome do server é obrigatório."); return; }
    updateMutation.mutate({
      id: deviceId,
      mac: form.mac.trim(),
      nomeServer: form.nomeServer.trim(),
      modoSelecao: form.modoSelecao,
      tipo: form.tipo,
      status: form.status,
      app: form.app || undefined,
      urlM3u8: form.urlM3u8 || undefined,
      urlEpg: form.urlEpg || undefined,
      valor: form.valor || undefined,
      dataExpiracao: form.dataExpiracao || undefined,
    });
  };

  const apps = appsData ?? [];

  if (error) {
    return (
      <AdminLayout title="Editar Usuário">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border border-destructive/20 p-6 shadow-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Editar Usuário">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/users">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3 h-3" /> Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Usuários &gt; Edição</h1>
            {device && <p className="text-xs text-muted-foreground">MAC: {device.mac}</p>}
          </div>
        </div>

        {/* Form */}
        {isLoading ? (
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-sm p-6 space-y-5">
            {/* Modo de Seleção */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MODO DE SELEÇÃO:</Label>
              <Select value={form.modoSelecao} onValueChange={v => setForm(f => ({ ...f, modoSelecao: v as "XTeamCode" | "M3U8" }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XTeamCode">XTeam Code</SelectItem>
                  <SelectItem value="M3U8">M3U8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MAC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MAC DO DISPOSITIVO:</Label>
              <Input
                placeholder="00:00:00:00:00:00"
                value={form.mac}
                onChange={e => setForm(f => ({ ...f, mac: e.target.value }))}
                className="h-10 font-mono"
              />
            </div>

            {/* Nome do Server */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NOME DO SERVER:</Label>
              <Input
                placeholder="Nome do servidor"
                value={form.nomeServer}
                onChange={e => setForm(f => ({ ...f, nomeServer: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Lista M3U8 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LISTA M3U8:</Label>
              <Input
                placeholder="URL da lista M3U8"
                value={form.urlM3u8}
                onChange={e => setForm(f => ({ ...f, urlM3u8: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* App */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP QUE O CLIENTE USARÁ:</Label>
              <Select value={form.app} onValueChange={v => setForm(f => ({ ...f, app: v }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um app" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map(a => (
                    <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TIPO DE CONTA:</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as "Usuario" | "Revenda" | "UltraMaster" | "Master" }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Usuario">Usuário</SelectItem>
                  <SelectItem value="Revenda">Revenda</SelectItem>
                  <SelectItem value="UltraMaster">Ultra Master</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">STATUS:</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as "Liberado" | "Bloqueado" | "Expirado" }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Liberado">Liberado</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  <SelectItem value="Expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL EPG */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL EPG:</Label>
              <Input
                placeholder="URL do EPG"
                value={form.urlEpg}
                onChange={e => setForm(f => ({ ...f, urlEpg: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VALOR DA ASSINATURA:</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                className="h-10"
                step="0.01"
                min="0"
              />
            </div>

            {/* Data de Expiração */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DATA DA EXPIRAÇÃO:</Label>
              <Input
                type="date"
                value={form.dataExpiracao}
                onChange={e => setForm(f => ({ ...f, dataExpiracao: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/users">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                <span>{updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
