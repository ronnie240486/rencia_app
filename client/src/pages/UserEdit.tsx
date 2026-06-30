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

/**
 * Monta a URL M3U8 a partir dos campos XteamCode (usuário, senha, servidor).
 */
function buildXteamUrl(server: string, username: string, password: string): string {
  const base = server.replace(/\/$/, "");
  return `${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
}

/**
 * Tenta extrair os campos XteamCode de uma URL M3U8 no formato get.php?username=...&password=...
 */
function parseXteamUrl(url: string): { server: string; username: string; password: string } | null {
  try {
    const u = new URL(url);
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (!username || !password) return null;
    const server = `${u.protocol}//${u.host}`;
    return { server, username, password };
  } catch {
    return null;
  }
}

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
    // M3U8
    urlM3u8: "",
    // XteamCode
    xtServer: "",
    xtUsername: "",
    xtPassword: "",
    // Comum
    app: "__none__",
    urlEpg: "",
    valor: "",
    dataExpiracao: "",
    tipo: "Usuario" as "Usuario" | "Revenda" | "UltraMaster" | "Master",
    status: "Liberado" as "Liberado" | "Bloqueado" | "Expirado",
    telefone: "",
  });

  // formKey força re-render dos Select quando os dados chegam do servidor
  const [formKey, setFormKey] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (device && !initialized) {
      const modo = (device.modoSelecao as "XTeamCode" | "M3U8") ?? "XTeamCode";
      let xtServer = "", xtUsername = "", xtPassword = "";
      if (modo === "XTeamCode" && device.urlM3u8) {
        const parsed = parseXteamUrl(device.urlM3u8);
        if (parsed) {
          xtServer = parsed.server;
          xtUsername = parsed.username;
          xtPassword = parsed.password;
        }
      }
      setForm({
        modoSelecao: modo,
        mac: device.mac ?? "",
        nomeServer: device.nomeServer ?? "",
        urlM3u8: device.urlM3u8 ?? "",
        xtServer,
        xtUsername,
        xtPassword,
        app: device.app && device.app.trim() !== "" ? device.app : "__none__",
        urlEpg: device.urlEpg ?? "",
        valor: device.valor ? String(device.valor) : "",
        dataExpiracao: device.dataExpiracao
          ? new Date(device.dataExpiracao).toISOString().split("T")[0]
          : "",
        tipo: (device.tipo as "Usuario" | "Revenda" | "UltraMaster" | "Master") ?? "Usuario",
        status: (device.status as "Liberado" | "Bloqueado" | "Expirado") ?? "Liberado",
        telefone: device.telefone ? device.telefone.replace(/^\+55/, "") : "",
      });
      // Incrementar formKey força os Select a re-renderizarem com os novos valores
      setFormKey(k => k + 1);
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

  // Formata MAC automaticamente: insere ":" a cada 2 dígitos hex
  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(":") ?? raw;
    setForm(f => ({ ...f, mac: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mac.trim()) { toast.error("MAC do dispositivo é obrigatório."); return; }
    if (!form.nomeServer.trim()) { toast.error("Nome do server é obrigatório."); return; }

    let urlM3u8 = form.urlM3u8;
    if (form.modoSelecao === "XTeamCode") {
      if (!form.xtServer.trim()) { toast.error("URL do servidor XteamCode é obrigatória."); return; }
      if (!form.xtUsername.trim()) { toast.error("Usuário XteamCode é obrigatório."); return; }
      if (!form.xtPassword.trim()) { toast.error("Senha XteamCode é obrigatória."); return; }
      urlM3u8 = buildXteamUrl(form.xtServer.trim(), form.xtUsername.trim(), form.xtPassword.trim());
    } else {
      if (!urlM3u8.trim()) { toast.error("URL M3U8 é obrigatória no modo M3U8."); return; }
    }

    updateMutation.mutate({
      id: deviceId,
      mac: form.mac.trim(),
      nomeServer: form.nomeServer.trim(),
      modoSelecao: form.modoSelecao,
      tipo: form.tipo,
      status: form.status,
      app: "OuroPro",
      urlM3u8: urlM3u8 || undefined,
      urlEpg: form.urlEpg || undefined,
      valor: form.valor || undefined,
      dataExpiracao: form.dataExpiracao || undefined,
      telefone: form.telefone ? `+55${form.telefone.replace(/\D/g, "")}` : undefined,
    });
  };

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
              <ArrowLeft className="w-3 h-3" /><span>Voltar</span>
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
          /* key={formKey} garante que todos os Select re-renderizam quando os dados chegam */
          <form key={formKey} onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-sm p-6 space-y-5">

            {/* MAC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                MAC DO DISPOSITIVO: <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="00:00:00:00:00:00"
                value={form.mac}
                onChange={handleMacChange}
                maxLength={17}
                className="h-10 font-mono"
              />
            </div>

            {/* Nome do Server */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NOME DO SERVER: <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nome do servidor"
                value={form.nomeServer}
                onChange={e => setForm(f => ({ ...f, nomeServer: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Modo de Seleção */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MODO DE SELEÇÃO:</Label>
              <Select
                value={form.modoSelecao}
                onValueChange={v => setForm(f => ({ ...f, modoSelecao: v as "XTeamCode" | "M3U8" }))}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Selecione o modo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XTeamCode">XTeam Code</SelectItem>
                  <SelectItem value="M3U8">M3U8 (URL direta)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos XteamCode */}
            {form.modoSelecao === "XTeamCode" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-4">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Dados do XTeam Code
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    URL DO SERVIDOR: <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="http://servidor.com:porta"
                    value={form.xtServer}
                    onChange={e => setForm(f => ({ ...f, xtServer: e.target.value }))}
                    className="h-10 font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      USUÁRIO: <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="username"
                      value={form.xtUsername}
                      onChange={e => setForm(f => ({ ...f, xtUsername: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      SENHA: <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="password"
                      value={form.xtPassword}
                      onChange={e => setForm(f => ({ ...f, xtPassword: e.target.value }))}
                      className="h-10"
                    />
                  </div>
                </div>
                {form.xtServer && form.xtUsername && form.xtPassword && (
                  <div className="rounded bg-muted p-2">
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {buildXteamUrl(form.xtServer, form.xtUsername, form.xtPassword)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lista M3U8 - só no modo M3U8 */}
            {form.modoSelecao === "M3U8" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  LISTA M3U8: <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="http://servidor.com:porta/get.php?username=...&password=...&type=m3u_plus"
                  value={form.urlM3u8}
                  onChange={e => setForm(f => ({ ...f, urlM3u8: e.target.value }))}
                  className="h-10 font-mono text-sm"
                />
              </div>
            )}

            {/* App - fixo OuroPro */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP DO CLIENTE:</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                OuroPro
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">STATUS:</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v as "Liberado" | "Bloqueado" | "Expirado" }))}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Liberado">✅ Liberado</SelectItem>
                  <SelectItem value="Bloqueado">🔒 Bloqueado</SelectItem>
                  <SelectItem value="Expirado">⏰ Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL EPG */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL EPG (opcional):</Label>
              <Input
                placeholder="URL do EPG"
                value={form.urlEpg}
                onChange={e => setForm(f => ({ ...f, urlEpg: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VALOR DA ASSINATURA (R$):</Label>
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
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DATA DE EXPIRAÇÃO:</Label>
              <Input
                type="date"
                value={form.dataExpiracao}
                onChange={e => setForm(f => ({ ...f, dataExpiracao: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TELEFONE / WHATSAPP:</Label>
              <div className="flex h-10">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-muted-foreground text-sm font-medium">
                  +55
                </span>
                <Input
                  placeholder="11999999999"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value.replace(/\D/g, "") }))}
                  className="h-10 rounded-l-none"
                  maxLength={11}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/users">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
