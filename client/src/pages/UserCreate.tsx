import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CLIENT_APP_OPTIONS } from "@/lib/clientAppOptions";
import { AppLogoBadge } from "@/components/AppLogoBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CalendarSearch, ChevronDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

function buildXteamUrl(server: string, username: string, password: string): string {
  const base = server.replace(/\/$/, "");
  return `${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
}

type ListaItem = {
  id: string;
  nome: string;
  modo: "XTeamCode" | "M3U8";
  urlM3u8: string;
  xtServer: string;
  xtUsername: string;
  xtPassword: string;
  urlEpg: string;
  isPrimary: boolean;
};

const APP_ID_BY_NAME: Record<string, string> = {
  OuroPro: "ouropro",
  "Ultra Player": "fusion",
  Maximus: "maximus",
  Prestige: "prestige",
  Optimus: "optimus",
  "Império Play": "imperio",
  Infinitus: "infinitus",
  Supremus: "supremus",
  Evolux: "evolux",
  Ominus: "ominus",
  Magnus: "magnus",
  Excellence: "excellence",
  Future: "future",
};

function newLista(isPrimary = false): ListaItem {
  return {
    id: Math.random().toString(36).slice(2),
    nome: isPrimary ? "Lista Principal" : "",
    modo: "XTeamCode",
    urlM3u8: "",
    xtServer: "",
    xtUsername: "",
    xtPassword: "",
    urlEpg: "",
    isPrimary,
  };
}

export default function UserCreate() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: appsData } = trpc.apps.list.useQuery();
  const { data: resellerAppAccess } = trpc.resellerAppAccess.me.useQuery();

  const [form, setForm] = useState({
    accessMode: "MAC" as "MAC" | "LOGIN_PASSWORD" | "NO_MAC",
    mac: "",
    nomeServer: "",
    nomeServidor: "",
    app: "OuroPro",
    valor: "",
    dataExpiracao: "",
    tipo: "Usuario" as "Usuario" | "Revenda" | "UltraMaster" | "Master",
    telefone: "",
  });
  const [linkedAppIds, setLinkedAppIds] = useState<string[]>(["ouropro"]);

  const [listas, setListas] = useState<ListaItem[]>([newLista(true)]);
  const [dnsList, setDnsList] = useState<Array<{ id: string; titulo: string; host: string }>>([]);
  const [createdDeviceId, setCreatedDeviceId] = useState<number | null>(null);
  const allowedAppOptions = useMemo(() => {
    if (!resellerAppAccess?.isRestricted) return CLIENT_APP_OPTIONS;
    return CLIENT_APP_OPTIONS.filter((option) => {
      const appId = APP_ID_BY_NAME[option.value];
      return appId && resellerAppAccess.allowedApps.includes(appId);
    });
  }, [resellerAppAccess]);

  useEffect(() => {
    if (!allowedAppOptions.length) return;
    const fallbackApp = allowedAppOptions[0].value;
    const allowedAppIds = new Set(allowedAppOptions.map((option) => APP_ID_BY_NAME[option.value]));
    setForm((current) => ({
      ...current,
      app: allowedAppOptions.some((option) => option.value === current.app) ? current.app : fallbackApp,
    }));
    setLinkedAppIds((selected) => Array.from(new Set([
      ...selected.filter((appId) => allowedAppIds.has(appId)),
      APP_ID_BY_NAME[fallbackApp],
    ].filter(Boolean))));
  }, [allowedAppOptions]);

  const lookupExpirationMutation = trpc.devices.lookupExpiration.useMutation({
    onSuccess: (result) => {
      if (!result.found || !result.expirationDate) {
        toast.message(result.message);
        return;
      }
      setForm((current) => ({ ...current, dataExpiracao: result.expirationDate! }));
      toast.success(`${result.message} A data será salva ao cadastrar o cliente.`);
    },
    onError: (error) => toast.error(error.message || "Não foi possível consultar a validade da lista."),
  });

  const setLinkedAppsMutation = trpc.devices.setLinkedApps.useMutation();

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: async (data) => {
      await setLinkedAppsMutation.mutateAsync({ id: data.id, appIds: linkedAppIds });
      // Adicionar listas extras (além da principal)
      const extras = listas.slice(1);
      for (const lista of extras) {
        let url = lista.urlM3u8;
        if (lista.modo === "XTeamCode" && lista.xtServer && lista.xtUsername && lista.xtPassword) {
          url = buildXteamUrl(lista.xtServer.trim(), lista.xtUsername.trim(), lista.xtPassword.trim());
        }
        if (url) {
          await addUrlMutation.mutateAsync({
            deviceId: data.id,
            nome: lista.nome || `Lista ${listas.indexOf(lista) + 1}`,
            modoSelecao: lista.modo,
            urlM3u8: lista.modo === "M3U8" ? lista.urlM3u8 : undefined,
            xtServer: lista.modo === "XTeamCode" ? lista.xtServer : undefined,
            xtUsername: lista.modo === "XTeamCode" ? lista.xtUsername : undefined,
            xtPassword: lista.modo === "XTeamCode" ? lista.xtPassword : undefined,
          });
        }
      }
      
      // Adicionar DNS
      for (const dns of dnsList) {
        if (dns.host.trim()) {
          // Aqui você pode chamar uma mutation para adicionar DNS ao dispositivo
          // Por enquanto, apenas salvamos as listas
        }
      }
      
      toast.success("Usuário cadastrado com sucesso!");
      utils.devices.list.invalidate();
      setCreatedDeviceId(data.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const addUrlMutation = trpc.deviceUrls.add.useMutation();

  const credentialMutation = trpc.appCredentials.create.useMutation({
    onSuccess: () => {
      toast.success("Acesso por login e senha cadastrado com sucesso!");
      utils.devices.list.invalidate();
      utils.appCredentials.list.invalidate();
      navigate("/credenciais-app");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(":") ?? raw;
    setForm(f => ({ ...f, mac: formatted }));
  };

  const updateLista = (id: string, patch: Partial<ListaItem>) => {
    setListas(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const consultExpiration = (lista: ListaItem) => {
    if (lista.modo === "XTeamCode" && (!lista.xtServer.trim() || !lista.xtUsername.trim() || !lista.xtPassword.trim())) return;
    if (lista.modo === "M3U8" && !lista.urlM3u8.trim()) return;
    lookupExpirationMutation.mutate({
      modoSelecao: lista.modo,
      urlM3u8: lista.urlM3u8.trim() || undefined,
      xtServer: lista.xtServer.trim() || undefined,
      xtUsername: lista.xtUsername.trim() || undefined,
      xtPassword: lista.xtPassword.trim() || undefined,
    });
  };

  const removeLista = (id: string) => {
    setListas(ls => ls.filter(l => l.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.accessMode === "MAC" && !form.mac.trim()) { toast.error("Informe o MAC ou escolha Cadastrar sem MAC."); return; }
    if (!form.nomeServer.trim()) { toast.error("Nome do server é obrigatório."); return; }

    const principal = listas[0];
    if (!principal) { toast.error("Adicione pelo menos uma lista."); return; }

    let urlM3u8 = principal.urlM3u8;
    if (principal.modo === "XTeamCode") {
      if (!principal.xtServer.trim()) { toast.error("URL do servidor XteamCode é obrigatória."); return; }
      if (!principal.xtUsername.trim()) { toast.error("Usuário XteamCode é obrigatório."); return; }
      if (!principal.xtPassword.trim()) { toast.error("Senha XteamCode é obrigatória."); return; }
      urlM3u8 = buildXteamUrl(principal.xtServer.trim(), principal.xtUsername.trim(), principal.xtPassword.trim());
    } else {
      if (!urlM3u8.trim()) { toast.error("URL M3U8 da lista principal é obrigatória."); return; }
    }

    if (form.accessMode === "LOGIN_PASSWORD") {
      const appId = APP_ID_BY_NAME[form.app];
      if (!appId) { toast.error("Selecione um aplicativo válido para o acesso por login."); return; }
      if (principal.modo !== "XTeamCode") { toast.error("O acesso por login usa obrigatoriamente os dados XTeam da Lista Principal."); return; }
      credentialMutation.mutate({
        xtServer: principal.xtServer.trim(),
        xtUsername: principal.xtUsername.trim(),
        xtPassword: principal.xtPassword,
        appId,
        nomeServer: form.nomeServer.trim(),
        nomeServidor: form.nomeServidor.trim() || undefined,
        tipo: form.tipo,
        urlEpg: principal.urlEpg || undefined,
        valor: form.valor || undefined,
        dataExpiracao: form.dataExpiracao || undefined,
        telefone: form.telefone ? `+55${form.telefone.replace(/\D/g, "")}` : undefined,
        extraLists: listas.slice(1).map((lista, index) => ({
          nome: lista.nome || `Lista ${index + 2}`,
          modoSelecao: lista.modo,
          urlM3u8: lista.modo === "XTeamCode" && lista.xtServer && lista.xtUsername && lista.xtPassword
            ? buildXteamUrl(lista.xtServer.trim(), lista.xtUsername.trim(), lista.xtPassword.trim())
            : (lista.urlM3u8 || undefined),
          xtServer: lista.modo === "XTeamCode" ? lista.xtServer || undefined : undefined,
          xtUsername: lista.modo === "XTeamCode" ? lista.xtUsername || undefined : undefined,
          xtPassword: lista.modo === "XTeamCode" ? lista.xtPassword || undefined : undefined,
        })),
      });
      return;
    }

    createMutation.mutate({
      mac: form.mac.trim() || undefined,
      accessMode: String(form.accessMode) === "LOGIN_PASSWORD" ? "LOGIN_PASSWORD" : "MAC",
      nomeServer: form.nomeServer.trim(),
      nomeServidor: form.nomeServidor.trim() || undefined,
      modoSelecao: principal.modo,
      tipo: form.tipo,
      app: form.app,
      urlM3u8: urlM3u8 || undefined,
      urlEpg: principal.urlEpg || undefined,
      valor: form.valor || undefined,
      dataExpiracao: form.dataExpiracao || undefined,
      telefone: form.telefone ? `+55${form.telefone.replace(/\D/g, "")}` : undefined,
    });
  };

  const apps = appsData ?? [];

  return (
    <AdminLayout title="Cadastro de Usuário">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/users">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3 h-3" /><span>Voltar</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Usuários &gt; Criação</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados do dispositivo */}
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Acesso do Cliente</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, accessMode: "MAC" }))} className={`rounded-lg border p-3 text-left transition-colors ${form.accessMode === "MAC" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}>
                <p className="text-sm font-semibold text-foreground">Por MAC</p>
                <p className="mt-1 text-xs text-muted-foreground">Mantém o modo atual de cadastro do aparelho.</p>
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, accessMode: "LOGIN_PASSWORD" }))} className={`rounded-lg border p-3 text-left transition-colors ${form.accessMode === "LOGIN_PASSWORD" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}>

                <p className="text-sm font-semibold text-foreground">Por login e senha</p>
                <p className="mt-1 text-xs text-muted-foreground">O MAC será vinculado automaticamente no primeiro acesso do APK.</p>
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, accessMode: "NO_MAC", mac: "" }))} className={`rounded-lg border p-3 text-left transition-colors ${form.accessMode === "NO_MAC" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}>
                <p className="text-sm font-semibold text-foreground">Cadastrar sem MAC</p>
                <p className="mt-1 text-xs text-muted-foreground">Adicione o MAC depois em Editar para liberar o aplicativo.</p>
              </button>
            </div>

            {form.accessMode === "MAC" ? <div className="space-y-1.5">
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
            </div> : form.accessMode === "LOGIN_PASSWORD" ? <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground"><strong className="text-foreground">Sem dados inventados:</strong> o login, a senha e a DNS do aplicativo serão exatamente o <strong className="text-foreground">Usuário, Senha e URL do Servidor XTeam</strong> informados na Lista Principal abaixo.</div> : <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground"><strong className="text-foreground">Cadastro provisório:</strong> nenhum MAC será salvo agora. Depois de entregar o aplicativo, abra <strong className="text-foreground">Editar → Adicionar MAC</strong> para vincular o aparelho.</div>}

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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP DO CLIENTE:</Label>
              <Select value={form.app} onValueChange={(value) => {
                const previousAppId = APP_ID_BY_NAME[form.app];
                const nextAppId = APP_ID_BY_NAME[value];
                setForm(f => ({ ...f, app: value }));
                if (nextAppId) setLinkedAppIds((selected) => Array.from(new Set([
                  ...selected.filter((appId) => appId !== previousAppId),
                  nextAppId,
                ])));
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um app" />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="h-10 w-full justify-between gap-2 text-left">
                      <span>{linkedAppIds.length ? `Aplicativos liberados (${linkedAppIds.length})` : "Aplicativos liberados para este cliente"}</span>
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-3rem))]">
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-foreground">Aplicativos liberados para este cliente</p>
                      <p className="mt-1 text-xs text-muted-foreground">Marque os APKs que poderão usar este mesmo MAC.</p>
                    </div>
                    {allowedAppOptions.map((appOption) => {
                      const appId = APP_ID_BY_NAME[appOption.value];
                      const checked = linkedAppIds.includes(appId);
                      return <DropdownMenuCheckboxItem
                        key={appOption.value}
                        checked={checked}
                        onCheckedChange={(value) => setLinkedAppIds((selected) => value
                          ? Array.from(new Set([...selected, appId]))
                          : selected.filter((id) => id !== appId))}
                      >
                        <span className="flex items-center gap-2">
                          <AppLogoBadge logoUrl={appOption.logoUrl} label={appOption.label} />
                          <span>{appOption.label}</span>
                        </span>
                      </DropdownMenuCheckboxItem>;
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">VALOR (R$):</Label>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DATA DE EXPIRAÇÃO:</Label>
                <Input
                  type="date"
                  value={form.dataExpiracao}
                  onChange={e => setForm(f => ({ ...f, dataExpiracao: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

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
          </div>

          {/* DNS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">DNS (Servidores)</p>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-xs btn-add-user"
                onClick={() => setDnsList(ds => [...ds, { id: Math.random().toString(36).slice(2), titulo: "", host: "" }])}
              >
                <Plus className="w-3 h-3" /> Adicionar DNS
              </Button>
            </div>

            {dnsList.map((dns, idx) => (
              <div key={dns.id} className="bg-card rounded-xl border shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    DNS {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDnsList(ds => ds.filter(d => d.id !== dns.id))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TÍTULO:</Label>
                  <Input
                    placeholder={`DNS ${idx + 1}`}
                    value={dns.titulo}
                    onChange={e => setDnsList(ds => ds.map(d => d.id === dns.id ? { ...d, titulo: e.target.value } : d))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HOST/URL:</Label>
                  <Input
                    placeholder="http://servidor.com ou http://servidor.com:8080"
                    value={dns.host}
                    onChange={e => setDnsList(ds => ds.map(d => d.id === dns.id ? { ...d, host: e.target.value } : d))}
                    className="h-9 font-mono text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Listas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Listas de Conteúdo</p>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 text-xs btn-add-user"
                onClick={() => setListas(ls => [...ls, newLista(false)])}
              >
                <Plus className="w-3 h-3" /> Adicionar lista
              </Button>
            </div>

            {listas.map((lista, idx) => (
              <div key={lista.id} className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                      {idx === 0 ? "PRINCIPAL" : `LISTA ${idx + 1}`}
                    </span>
                  </div>
                  {idx > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeLista(lista.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {idx > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">NOME DA LISTA:</Label>
                    <Input
                      placeholder={`Lista ${idx + 1}`}
                      value={lista.nome}
                      onChange={e => updateLista(lista.id, { nome: e.target.value })}
                      className="h-9"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MODO:</Label>
                  <Select value={lista.modo} onValueChange={v => updateLista(lista.id, { modo: v as "XTeamCode" | "M3U8" })}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XTeamCode">XTeam Code</SelectItem>
                      <SelectItem value="M3U8">M3U8 (URL direta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {lista.modo === "XTeamCode" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        URL DO SERVIDOR: <span className="text-red-500">{idx === 0 ? "*" : ""}</span>
                      </Label>
                      <Input
                        placeholder="http://servidor.com:porta"
                        value={lista.xtServer}
                        onChange={e => updateLista(lista.id, { xtServer: e.target.value })}
                        className="h-9 font-mono text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          USUÁRIO: <span className="text-red-500">{idx === 0 ? "*" : ""}</span>
                        </Label>
                        <Input
                          placeholder="username"
                          value={lista.xtUsername}
                          onChange={e => updateLista(lista.id, { xtUsername: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          SENHA: <span className="text-red-500">{idx === 0 ? "*" : ""}</span>
                        </Label>
                        <Input
                          placeholder="password"
                          value={lista.xtPassword}
                          onChange={e => updateLista(lista.id, { xtPassword: e.target.value })}
                          onBlur={() => consultExpiration(lista)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    {lista.xtServer && lista.xtUsername && lista.xtPassword && (
                      <div className="rounded bg-muted p-2">
                        <p className="text-xs text-muted-foreground font-mono break-all">
                          {buildXteamUrl(lista.xtServer, lista.xtUsername, lista.xtPassword)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {lista.modo === "M3U8" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      URL M3U8: <span className="text-red-500">{idx === 0 ? "*" : ""}</span>
                    </Label>
                    <Input
                      placeholder="http://servidor.com:porta/get.php?username=...&password=..."
                      value={lista.urlM3u8}
                      onChange={e => updateLista(lista.id, { urlM3u8: e.target.value })}
                      onBlur={() => consultExpiration(lista)}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">A validade é consultada automaticamente ao terminar de informar a lista.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 dark:!text-white"
                    disabled={lookupExpirationMutation.isPending}
                    onClick={() => consultExpiration(lista)}
                  >
                    {lookupExpirationMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarSearch className="h-3.5 w-3.5" />}
                    Consultar validade
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL EPG (opcional):</Label>
                  <Input
                    placeholder="URL do EPG"
                    value={lista.urlEpg}
                    onChange={e => updateLista(lista.id, { urlEpg: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/users">
              <Button type="button" variant="outline" className="dark:!text-white">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending || credentialMutation.isPending} className="gap-2 btn-add-user-bottom">
              <Save className="w-4 h-4" />
              {createMutation.isPending || credentialMutation.isPending ? "Enviando..." : form.accessMode === "LOGIN_PASSWORD" ? "Cadastrar Acesso" : "Cadastrar Usuário"}
            </Button>
          </div>
        </form>

        <Dialog open={createdDeviceId !== null} onOpenChange={(open) => { if (!open) setCreatedDeviceId(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cliente cadastrado com a primeira lista</DialogTitle>
              <DialogDescription>
                Você pode adicionar outra lista agora. As listas já cadastradas serão preservadas e o mesmo cliente pode ter quantas listas você quiser.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => navigate("/users")}>Ver clientes</Button>
              <Button className="btn-add-user" onClick={() => createdDeviceId && navigate(`/users/${createdDeviceId}/lists`)}><Plus className="mr-1.5 h-4 w-4" /> Adicionar lista</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
