import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const { data: appsData } = trpc.apps.list.useQuery();

  const [form, setForm] = useState({
    mac: "",
    nomeServer: "",
    app: "__none__",
    valor: "",
    dataExpiracao: "",
    tipo: "Usuario" as "Usuario" | "Revenda" | "UltraMaster" | "Master",
    telefone: "",
  });

  const [listas, setListas] = useState<ListaItem[]>([newLista(true)]);

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: async (data) => {
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
            urlM3u8: url,
          });
        }
      }
      toast.success("Usuário cadastrado com sucesso!");
      navigate("/users");
    },
    onError: (e) => toast.error(e.message),
  });

  const addUrlMutation = trpc.deviceUrls.add.useMutation();

  const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(":") ?? raw;
    setForm(f => ({ ...f, mac: formatted }));
  };

  const updateLista = (id: string, patch: Partial<ListaItem>) => {
    setListas(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const removeLista = (id: string) => {
    setListas(ls => ls.filter(l => l.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mac.trim()) { toast.error("MAC do dispositivo é obrigatório."); return; }
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

    createMutation.mutate({
      mac: form.mac.trim(),
      nomeServer: form.nomeServer.trim(),
      modoSelecao: principal.modo,
      tipo: form.tipo,
      app: form.app !== "__none__" ? form.app : undefined,
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
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Dados do Dispositivo</p>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TIPO DE CONTA:</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as "Usuario" | "Revenda" | "UltraMaster" | "Master" }))}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Usuario">Usuário</SelectItem>
                    <SelectItem value="Revenda">Revenda</SelectItem>
                    <SelectItem value="UltraMaster">Ultra Master</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP DO CLIENTE:</Label>
                <Select value={form.app} onValueChange={v => setForm(f => ({ ...f, app: v }))}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {apps.map(a => (
                      <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {/* Listas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Listas de Conteúdo</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setListas(ls => [...ls, newLista(false)])}
              >
                <Plus className="w-3 h-3" /> Adicionar Lista
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
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                )}

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
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {createMutation.isPending ? "Enviando..." : "Cadastrar Usuário"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
