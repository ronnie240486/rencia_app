import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const APP_NAMES: Record<string, string> = {
  ouropro: "Ouro Pro", fusion: "Fusion", maximus: "Maximus Player", prestige: "Prestige", optimus: "Optimus", imperio: "Império Play", infinitus: "Infinitus", supremus: "Supremus", evolux: "Evolux",
};

function formatDate(value: Date | string | null) {
  if (!value) return "Sem data";
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function AppCredentials() {
  const utils = trpc.useUtils();
  const { data: credentials = [], isLoading } = trpc.appCredentials.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"Liberado" | "Bloqueado" | "Expirado">("Liberado");
  const [expiration, setExpiration] = useState("");
  const selected = credentials.find((credential) => credential.id === selectedId) ?? null;

  const updateMutation = trpc.appCredentials.update.useMutation({
    onSuccess: () => {
      toast.success("Credencial atualizada.");
      setSelectedId(null);
      setPassword("");
      utils.appCredentials.list.invalidate();
      utils.devices.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const removeMutation = trpc.appCredentials.remove.useMutation({
    onSuccess: () => {
      toast.success("Credencial removida. O cadastro do cliente foi preservado.");
      utils.appCredentials.list.invalidate();
      utils.devices.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const openEdit = (credential: typeof credentials[number]) => {
    setSelectedId(credential.id);
    setStatus(credential.status);
    setExpiration(credential.dataExpiracao ? String(credential.dataExpiracao).slice(0, 10) : "");
    setPassword("");
  };

  return (
    <AdminLayout title="Credenciais de Aplicativo">
      <div className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Acessos por login e senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">Cada acesso usa as listas, validade, status e avisos do cliente vinculado. O MAC é registrado no primeiro login do APK.</p>
              </div>
            </div>
            <Link href="/users/create"><Button className="gap-2"><Plus className="h-4 w-4" />Cadastrar acesso</Button></Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4"><h2 className="font-semibold text-foreground">Credenciais cadastradas</h2></div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando credenciais...</div>
          ) : credentials.length === 0 ? (
            <div className="p-10 text-center"><KeyRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium text-foreground">Nenhuma credencial cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Crie o primeiro acesso para entregar login e senha ao cliente.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Cliente / login</th><th className="px-5 py-3 font-semibold">Aplicativo</th><th className="px-5 py-3 font-semibold">MAC</th><th className="px-5 py-3 font-semibold">Validade</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Ações</th></tr></thead>
                <tbody>
                  {credentials.map((credential) => (
                    <tr key={credential.id} className="border-t transition-colors hover:bg-muted/25">
                      <td className="px-5 py-3"><p className="font-medium text-foreground">{credential.nomeServer}</p><p className="font-mono text-xs text-muted-foreground">{credential.username}</p></td>
                      <td className="px-5 py-3">{APP_NAMES[credential.appId] ?? credential.appId}</td>
                      <td className="px-5 py-3 font-mono text-xs">{credential.mac === "LOGIN:PENDENTE" ? <span className="text-muted-foreground">Aguardando 1º login</span> : credential.mac}</td>
                      <td className="px-5 py-3">{formatDate(credential.dataExpiracao)}</td>
                      <td className="px-5 py-3"><Badge variant={credential.status === "Liberado" && credential.active ? "default" : "destructive"}>{credential.status === "Liberado" && credential.active ? "Liberado" : credential.status}</Badge></td>
                      <td className="px-5 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Editar credencial" onClick={() => openEdit(credential)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Excluir credencial" className="text-destructive hover:text-destructive" disabled={removeMutation.isPending} onClick={() => { if (window.confirm(`Remover o login ${credential.username}? O cliente e as listas continuarão cadastrados.`)) removeMutation.mutate({ id: credential.id }); }}><Trash2 className="h-4 w-4" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar credencial</DialogTitle><DialogDescription>{selected ? `Login ${selected.username} para ${selected.nomeServer}. Deixe a nova senha vazia para mantê-la.` : ""}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Status do cliente</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Liberado">Liberado</SelectItem><SelectItem value="Bloqueado">Bloqueado</SelectItem><SelectItem value="Expirado">Expirado</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Nova validade</Label><Input type="date" value={expiration} onChange={(event) => setExpiration(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)}>Cancelar</Button><Button disabled={updateMutation.isPending || !selected} onClick={() => selected && updateMutation.mutate({ id: selected.id, password, status, active: status === "Liberado", dataExpiracao: expiration })}>{updateMutation.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
