import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Monta a URL M3U8 a partir dos campos XteamCode (usuário, senha, servidor).
 */
function buildXteamUrl(server: string, username: string, password: string): string {
  const base = server.replace(/\/$/, "");
  return `${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
}

export default function UserCreate() {
  const [, navigate] = useLocation();
  const { data: appsData } = trpc.apps.list.useQuery();

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
  });

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário cadastrado com sucesso!");
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

    createMutation.mutate({
      mac: form.mac.trim(),
      nomeServer: form.nomeServer.trim(),
      modoSelecao: form.modoSelecao,
      tipo: form.tipo,
      app: form.app !== "__none__" ? form.app : undefined,
      urlM3u8: urlM3u8 || undefined,
      urlEpg: form.urlEpg || undefined,
      valor: form.valor || undefined,
      dataExpiracao: form.dataExpiracao || undefined,
    });
  };

  const apps = appsData ?? [];

  return (
    <AdminLayout title="Cadastro de Usuário">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/users">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3 h-3" /><span>Voltar</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Usuários &gt; Criação</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border shadow-sm p-6 space-y-5">

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
            <Select value={form.modoSelecao} onValueChange={v => setForm(f => ({ ...f, modoSelecao: v as "XTeamCode" | "M3U8" }))}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
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

          {/* Lista M3U8 - só mostrar no modo M3U8 */}
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

          {/* App */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP QUE O CLIENTE USARÁ:</Label>
            <Select value={form.app} onValueChange={v => setForm(f => ({ ...f, app: v }))}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Selecione um app (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
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
