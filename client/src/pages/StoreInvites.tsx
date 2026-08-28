import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { MANAGED_APP_CATALOG, type ManagedAppId } from "@shared/appCatalog";
import { CalendarDays, Check, Copy, Link2, Loader2, LockKeyhole, Plus, Store, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const allAppIds = Object.keys(MANAGED_APP_CATALOG) as ManagedAppId[];

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function isInviteActive(invite: { revokedAt?: Date | string | null; expiresAt?: Date | string | null }) {
  return !invite.revokedAt && (!invite.expiresAt || new Date(invite.expiresAt) > new Date());
}

export default function StoreInvites() {
  const utils = trpc.useUtils();
  const { data: invites = [], isLoading } = trpc.storeInvites.list.useQuery();
  const [open, setOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<"revenda" | "cliente">("cliente");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [selectedApps, setSelectedApps] = useState<ManagedAppId[]>([]);
  const [createdLink, setCreatedLink] = useState("");

  const createMutation = trpc.storeInvites.create.useMutation({
    onSuccess: (result) => {
      const url = `${window.location.origin}/convite/${result.token}`;
      setCreatedLink(url);
      utils.storeInvites.list.invalidate();
      toast.success("Convite privado criado. Copie o link antes de fechar.");
    },
    onError: (error) => toast.error(error.message),
  });
  const revokeMutation = trpc.storeInvites.revoke.useMutation({
    onSuccess: () => { toast.success("Convite revogado."); utils.storeInvites.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const activeCount = useMemo(() => invites.filter(isInviteActive).length, [invites]);
  const resetForm = () => { setLabel(""); setSelectedApps([]); setCreatedLink(""); setRecipientType("cliente"); setExpiresAt(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)); };
  const toggleApp = (appId: ManagedAppId) => setSelectedApps((current) => current.includes(appId) ? current.filter((id) => id !== appId) : [...current, appId]);
  const toggleAll = () => setSelectedApps((current) => current.length === allAppIds.length ? [] : allAppIds);
  const createInvite = () => {
    if (label.trim().length < 2) { toast.error("Informe um nome para identificar o convite."); return; }
    if (!selectedApps.length) { toast.error("Selecione pelo menos um aplicativo."); return; }
    const expiry = new Date(`${expiresAt}T23:59:59`).toISOString();
    createMutation.mutate({ recipientType, label: label.trim(), allowedApps: selectedApps, expiresAt: expiry });
  };
  const copyLink = async (link: string) => {
    try { await navigator.clipboard.writeText(link); toast.success("Link copiado."); }
    catch { toast.error("Não foi possível copiar. Selecione o link manualmente."); }
  };

  return <AdminLayout title="Convites da Loja">
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="max-w-2xl"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200"><LockKeyhole size={22} /></div><h1 className="text-2xl font-black">Loja privada por convite</h1><p className="mt-2 text-sm leading-6 text-slate-300">Cada link mostra somente os aplicativos que você escolheu. A pessoa não entra no painel e não vê os demais APKs ou códigos.</p></div>
          <Button className="gap-2 bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => { resetForm(); setOpen(true); }}><Plus size={16} /> Criar convite</Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Convites ativos</p><p className="mt-2 text-2xl font-black text-foreground">{activeCount}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Revendas</p><p className="mt-2 text-2xl font-black text-foreground">{invites.filter((invite) => invite.recipientType === "revenda" && isInviteActive(invite)).length}</p></div>
        <div className="rounded-xl border bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Clientes</p><p className="mt-2 text-2xl font-black text-foreground">{invites.filter((invite) => invite.recipientType === "cliente" && isInviteActive(invite)).length}</p></div>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold text-foreground">Links criados</h2><p className="text-xs text-muted-foreground">Por segurança, o endereço completo é mostrado somente no momento da criação.</p></div><Link2 className="text-muted-foreground" size={18} /></div>
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div> : invites.length ? <div className="divide-y">{invites.map((invite) => {
          const active = isInviteActive(invite);
          return <div key={invite.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{invite.label}</p><Badge variant="outline" className={active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-muted text-muted-foreground"}>{active ? "Ativo" : invite.revokedAt ? "Revogado" : "Vencido"}</Badge><Badge variant="outline">{invite.recipientType === "revenda" ? "Revenda" : "Cliente"}</Badge></div><div className="mt-2 flex flex-wrap gap-1">{invite.allowedApps.map((appId) => <Badge key={appId} variant="secondary" className="text-[10px]">{MANAGED_APP_CATALOG[appId as ManagedAppId]?.displayName ?? appId}</Badge>)}</div><p className="mt-2 text-xs text-muted-foreground">Válido até {formatDate(invite.expiresAt)} · último acesso: {formatDate(invite.lastAccessedAt)}</p></div>{active && <Button size="sm" variant="outline" className="w-fit gap-1 text-destructive hover:text-destructive" onClick={() => revokeMutation.mutate({ id: invite.id })} disabled={revokeMutation.isPending}><Trash2 size={14} /> Revogar</Button>}</div>;
        })}</div> : <div className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum convite criado. Gere um link privado para começar.</div>}
      </section>
    </div>

    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{createdLink ? "Convite criado" : "Criar convite privado"}</DialogTitle></DialogHeader>
        {createdLink ? <div className="space-y-4"><p className="text-sm text-muted-foreground">Envie este link somente para a pessoa escolhida. Ele mostra apenas os aplicativos selecionados e não dá acesso ao painel.</p><div className="flex gap-2"><Input value={createdLink} readOnly className="font-mono text-xs" /><Button onClick={() => copyLink(createdLink)} className="gap-1"><Copy size={15} /> Copiar</Button></div><p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">Por segurança, o endereço completo não fica gravado na lista depois que esta janela for fechada. Se perder o link, revogue o convite e crie outro.</p></div> : <div className="space-y-5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setRecipientType("cliente")} className={`rounded-xl border p-3 text-left ${recipientType === "cliente" ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "hover:bg-muted/50"}`}><Users className="mb-2 text-cyan-600" size={18} /><p className="font-semibold">Cliente</p><p className="text-xs text-muted-foreground">Link limitado aos apps escolhidos</p></button><button type="button" onClick={() => setRecipientType("revenda")} className={`rounded-xl border p-3 text-left ${recipientType === "revenda" ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "hover:bg-muted/50"}`}><Store className="mb-2 text-cyan-600" size={18} /><p className="font-semibold">Revenda</p><p className="text-xs text-muted-foreground">Link separado para distribuição</p></button></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invite-label">Identificação</Label><Input id="invite-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={recipientType === "revenda" ? "Nome da revenda" : "Nome do cliente ou grupo"} /></div><div className="space-y-2"><Label htmlFor="invite-expiry">Válido até</Label><div className="relative"><CalendarDays className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input id="invite-expiry" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="pl-9" /></div></div></div><div><div className="mb-2 flex items-center justify-between"><Label>Aplicativos liberados</Label><Button type="button" variant="ghost" size="sm" onClick={toggleAll}>{selectedApps.length === allAppIds.length ? "Limpar" : "Selecionar todos"}</Button></div><div className="grid gap-2 sm:grid-cols-2">{Object.values(MANAGED_APP_CATALOG).map((app) => { const active = selectedApps.includes(app.id); return <button key={app.id} type="button" onClick={() => toggleApp(app.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${active ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" : "hover:bg-muted/50"}`}><div className={`grid h-5 w-5 place-items-center rounded border text-xs ${active ? "border-cyan-600 bg-cyan-600 text-white" : "border-muted-foreground/40"}`}>{active && <Check size={13} />}</div><img src={app.defaultLogoUrl} alt="" className="h-8 w-8 rounded-lg border bg-muted object-cover" /><span className="font-medium">{app.displayName}</span></button>; })}</div></div></div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{createdLink ? "Fechar" : "Cancelar"}</Button>{!createdLink && <Button onClick={createInvite} disabled={createMutation.isPending} className="gap-2">{createMutation.isPending && <Loader2 className="animate-spin" size={15} />}<Link2 size={15} /> Criar link privado</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </AdminLayout>;
}
