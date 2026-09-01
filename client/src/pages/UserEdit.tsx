import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CLIENT_APP_OPTIONS } from "@/lib/clientAppOptions";
import { AppLogoBadge } from "@/components/AppLogoBadge";
import { AlertTriangle, ArrowLeft, CalendarSearch, ListPlus, Loader2, Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { toDateOnly } from "@shared/dateOnly";
import { MANAGED_APP_CATALOG } from "@shared/appCatalog";

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
  const { data: resellerAppAccess } = trpc.resellerAppAccess.me.useQuery();
  const { data: device, isLoading, error } = trpc.devices.getById.useQuery(
    { id: deviceId },
    { enabled: !isNaN(deviceId) && deviceId > 0, refetchOnMount: "always" }
  );
  const { data: linkedApps } = trpc.devices.linkedApps.useQuery(
    { id: deviceId },
    { enabled: !isNaN(deviceId) && deviceId > 0 },
  );

  const [form, setForm] = useState({
    modoSelecao: "XTeamCode" as "XTeamCode" | "M3U8",
    mac: "",
    nomeServer: "",
    nomeServidor: "",
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
    maxConcurrentConnections: 1,
  });
  const allowedAppOptions = resellerAppAccess?.isRestricted
    ? CLIENT_APP_OPTIONS.filter((option) => Object.values(MANAGED_APP_CATALOG).some((app) => resellerAppAccess.allowedApps.includes(app.id) && app.deviceAliases.includes(option.value as never)))
    : CLIENT_APP_OPTIONS;

  // formKey força re-render dos Select quando os dados chegam do servidor
  const [formKey, setFormKey] = useState(0);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [linkedAppIds, setLinkedAppIds] = useState<string[]>([]);
  const [isMacEditorOpen, setIsMacEditorOpen] = useState(false);

  useEffect(() => {
    if (device && !hasUserEdited) {
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
        nomeServidor: device.nomeServidor ?? "",
        urlM3u8: device.urlM3u8 ?? "",
        xtServer,
        xtUsername,
        xtPassword,
        app: device.app ?? "OuroPro",
        urlEpg: device.urlEpg ?? "",
        valor: device.valor ? String(device.valor) : "",
        dataExpiracao: toDateOnly(device.dataExpiracao),
        tipo: (device.tipo as "Usuario" | "Revenda" | "UltraMaster" | "Master") ?? "Usuario",
        status: (device.status as "Liberado" | "Bloqueado" | "Expirado") ?? "Liberado",
        telefone: device.telefone ? device.telefone.replace(/^\+55/, "") : "",
        maxConcurrentConnections: device.maxConcurrentConnections ?? 1,
      });
      // Incrementar formKey força os Select a re-renderizarem com os novos valores
      setFormKey(k => k + 1);
    }
  }, [device, hasUserEdited]);

  useEffect(() => {
    if (linkedApps) setLinkedAppIds(linkedApps);
  }, [linkedApps]);

  const utils = trpc.useUtils();
  const setLinkedAppsMutation = trpc.devices.setLinkedApps.useMutation();

  const lookupExpirationMutation = trpc.devices.lookupExpiration.useMutation({
    onSuccess: (result) => {
      if (!result.found || !result.expirationDate) {
        toast.message(result.message);
        return;
      }
      setHasUserEdited(true);
      setForm((current) => ({ ...current, dataExpiracao: result.expirationDate! }));
      toast.success(`${result.message} Clique em Salvar Alterações para confirmar.`);
    },
    onError: (error) => toast.error(error.message || "Não foi possível consultar a validade da lista."),
  });

  const consultExpiration = () => {
    if (form.modoSelecao === "XTeamCode" && (!form.xtServer.trim() || !form.xtUsername.trim() || !form.xtPassword.trim())) return;
    if (form.modoSelecao === "M3U8" && !form.urlM3u8.trim()) return;
    lookupExpirationMutation.mutate({
      modoSelecao: form.modoSelecao,
      urlM3u8: form.urlM3u8.trim() || undefined,
      xtServer: form.xtServer.trim() || undefined,
      xtUsername: form.xtUsername.trim() || undefined,
      xtPassword: form.xtPassword.trim() || undefined,
    });
  };

  const updateMutation = trpc.devices.update.useMutation({
    onSuccess: async (result) => {
      await setLinkedAppsMutation.mutateAsync({ id: deviceId, appIds: linkedAppIds });
      if (result.device) {
        utils.devices.getById.setData({ id: deviceId }, result.device);
      }
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
    setHasUserEdited(true);
    setForm(f => ({ ...f, mac: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      mac: form.mac.trim() || undefined,
      nomeServer: form.nomeServer.trim(),
      nomeServidor: form.nomeServidor.trim() || undefined,
      modoSelecao: form.modoSelecao,
      tipo: form.tipo,
      status: form.status,
      app: form.app,
      urlM3u8: urlM3u8 || undefined,
      urlEpg: form.urlEpg || undefined,
      valor: form.valor || undefined,
      dataExpiracao: form.dataExpiracao || undefined,
      telefone: form.telefone ? `+55${form.telefone.replace(/\D/g, "")}` : undefined,
      maxConcurrentConnections: form.maxConcurrentConnections,
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
          <form key={formKey} onSubmit={handleSubmit} onChangeCapture={() => setHasUserEdited(true)} className="bg-card rounded-xl border shadow-sm p-6 space-y-5">

            {/* MAC */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MAC DO DISPOSITIVO{form.mac ? "" : " (OPCIONAL)"}</Label>
                {!form.mac && !isMacEditorOpen && <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={() => setIsMacEditorOpen(true)}><Plus className="h-3.5 w-3.5" /> Adicionar MAC</Button>}
              </div>
              {form.mac || isMacEditorOpen ? <Input placeholder="00:00:00:00:00:00" value={form.mac} onChange={handleMacChange} maxLength={17} className="h-10 font-mono" /> : <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">Nenhum MAC vinculado. Cadastre o cliente primeiro e adicione o aparelho depois por este botão.</p>}
            </div>

            {/* Nome do cliente e nome do servidor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                NOME DO CLIENTE: <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nome do cliente"
                value={form.nomeServer}
                onChange={e => setForm(f => ({ ...f, nomeServer: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NOME DO SERVIDOR:</Label>
              <Input
                placeholder="Opcional — não impede o cadastro"
                value={form.nomeServidor}
                onChange={e => setForm(f => ({ ...f, nomeServidor: e.target.value }))}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">Você pode preencher depois, se necessário.</p>
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
                          onBlur={consultExpiration}
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
                    onBlur={consultExpiration}
                    className="h-10 font-mono text-sm"
                  />
                </div>
              )}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">A validade é consultada ao terminar de preencher a lista e não altera a data se o provedor não informar uma validade.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 dark:!text-white"
                disabled={lookupExpirationMutation.isPending}
                onClick={consultExpiration}
              >
                {lookupExpirationMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarSearch className="h-3.5 w-3.5" />}
                Consultar validade
              </Button>
            </div>

            {/* App - Selecionável entre OuroPro e Maximus */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP DO CLIENTE:</Label>
              <Select
                value={form.app}
                onValueChange={v => {
                  setHasUserEdited(true);
                  const previousAppId = Object.values(MANAGED_APP_CATALOG).find((app) => app.deviceAliases.includes(form.app as never))?.id;
                  setForm(f => ({ ...f, app: v }));
                  const nextAppId = Object.values(MANAGED_APP_CATALOG).find((app) => app.deviceAliases.includes(v as never))?.id;
                  if (nextAppId) setLinkedAppIds((selected) => Array.from(new Set([
                    ...selected.filter((appId) => appId !== previousAppId),
                    nextAppId,
                  ])));
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Selecione o app" />
                </SelectTrigger>
                <SelectContent>
                  {allowedAppOptions.map((appOption) => (
                    <SelectItem key={appOption.value} value={appOption.value}>
                      <span className="flex items-center gap-2">
                        <AppLogoBadge logoUrl={appOption.logoUrl} label={appOption.label} />
                        <span>{appOption.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-3 rounded-lg border border-dashed p-3">
                <p className="text-xs font-semibold text-foreground">Aplicativos liberados para este cliente</p>
                <p className="mt-1 text-xs text-muted-foreground">Marque os APKs que podem usar este mesmo MAC. Não será criado outro cliente.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {allowedAppOptions.map((appOption) => {
                    const appId = Object.values(MANAGED_APP_CATALOG).find((app) => app.deviceAliases.includes(appOption.value as never))?.id;
                    if (!appId) return null;
                    const checked = linkedAppIds.includes(appId);
                    return <label key={appOption.value} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setHasUserEdited(true);
                          setLinkedAppIds((selected) => event.target.checked
                            ? Array.from(new Set([...selected, appId]))
                            : selected.filter((id) => id !== appId));
                        }}
                      />
                      <AppLogoBadge logoUrl={appOption.logoUrl} label={appOption.label} />
                      <span>{appOption.label}</span>
                    </label>;
                  })}
                </div>
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

            <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Listas do cliente</p>
                <p className="mt-1 text-xs text-muted-foreground">A lista principal fica neste cadastro. Use o botão para adicionar Lista 2, Lista 3 e as próximas, sem substituir as que já existem.</p>
              </div>
              <Link href={`/users/${deviceId}/lists`}>
                <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto"><ListPlus className="h-4 w-4" /> Adicionar lista</Button>
              </Link>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LIMITE DE CONEXÕES SIMULTÂNEAS:</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={form.maxConcurrentConnections}
                onChange={e => setForm(f => ({ ...f, maxConcurrentConnections: Math.min(10, Math.max(1, Number(e.target.value) || 1)) }))}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">Define a quantidade máxima configurada para este cliente.</p>
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
                <Button type="button" variant="outline" className="dark:!text-white">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2 dark:!text-white dark:!bg-green-600 dark:hover:!bg-green-700">
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
