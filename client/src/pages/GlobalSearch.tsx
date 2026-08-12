import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { List, Search, Server, Smartphone, Store, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function GlobalSearch() {
  const [term, setTerm] = useState("");
  const query = trpc.globalSearch.query.useQuery({ term: term.trim() }, { enabled: term.trim().length >= 2 });
  const results = query.data;
  const total = (results?.devices.length ?? 0) + (results?.lists.length ?? 0) + (results?.resellers.length ?? 0);

  return <AdminLayout title="Busca Global"><div className="space-y-6">
    <div><div className="flex items-center gap-2 text-primary mb-1"><Search size={19} /><span className="text-xs font-bold uppercase tracking-[.18em]">Super Painel</span></div><h1 className="text-2xl font-bold">Busca Global</h1><p className="text-sm text-muted-foreground mt-1">Encontre clientes, MACs, telefones, listas e revendas em uma única busca.</p></div>
    <Card className="border-primary/25"><CardContent className="p-4"><div className="relative"><Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} className="pl-10 h-12 text-base" placeholder="Digite nome, MAC, telefone, URL de lista ou e-mail…" /></div><p className="mt-2 text-xs text-muted-foreground">Digite pelo menos 2 caracteres. A busca respeita os clientes e revendas ligados ao seu painel.</p></CardContent></Card>
    {term.trim().length >= 2 && <p className="text-sm text-muted-foreground">{query.isFetching ? "Buscando…" : `${total} resultado(s) encontrado(s).`}</p>}
    {results && <div className="grid gap-5 lg:grid-cols-3">
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Smartphone size={17} /> Clientes</CardTitle><CardDescription>{results.devices.length} encontrado(s)</CardDescription></CardHeader><CardContent className="space-y-3">{results.devices.map((item) => <Link key={item.id} href={`/cliente/${item.id}`}><div className="cursor-pointer rounded-lg border p-3 hover:bg-muted/50"><p className="font-medium truncate">{item.nomeServer}</p><p className="font-mono text-xs text-muted-foreground mt-1">{item.mac}</p><p className="text-xs text-muted-foreground mt-1">{item.ownerName}{item.telefone ? ` · ${item.telefone}` : ""}</p><Badge variant="secondary" className="mt-2">{item.status}</Badge></div></Link>)}{results.devices.length === 0 && <Empty icon={UserRound} label="Nenhum cliente encontrado." />}</CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><List size={17} /> Listas</CardTitle><CardDescription>{results.lists.length} encontrada(s)</CardDescription></CardHeader><CardContent className="space-y-3">{results.lists.map((item) => <Link key={item.id} href={`/users/${item.deviceId}/lists`}><div className="cursor-pointer rounded-lg border p-3 hover:bg-muted/50"><p className="font-medium truncate">{item.nome}</p><p className="text-xs text-muted-foreground mt-1 truncate">Cliente: {item.deviceName} · {item.deviceMac}</p><p className="text-xs text-muted-foreground mt-1 truncate">{item.urlM3u8 || item.xtServer || "Sem URL registrada"}</p></div></Link>)}{results.lists.length === 0 && <Empty icon={Server} label="Nenhuma lista encontrada." />}</CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Store size={17} /> Revendas</CardTitle><CardDescription>{results.resellers.length} encontrada(s)</CardDescription></CardHeader><CardContent className="space-y-3">{results.resellers.map((item) => <Link key={item.id} href="/revendas"><div className="cursor-pointer rounded-lg border p-3 hover:bg-muted/50"><p className="font-medium truncate">{item.name || "Sem nome"}</p><p className="text-xs text-muted-foreground mt-1 truncate">{item.email}</p><div className="mt-2 flex gap-2"><Badge variant="secondary">{item.plano || "Revenda"}</Badge><Badge variant={item.isActive ? "default" : "destructive"}>{item.isActive ? "Ativa" : "Bloqueada"}</Badge></div></div></Link>)}{results.resellers.length === 0 && <Empty icon={Store} label="Nenhuma revenda encontrada." />}</CardContent></Card>
    </div>}
    {query.error && <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Não foi possível concluir a busca: {query.error.message}</CardContent></Card>}
  </div></AdminLayout>;
}

function Empty({ icon: Icon, label }: { icon: typeof Search; label: string }) { return <div className="py-8 text-center text-sm text-muted-foreground"><Icon size={24} className="mx-auto mb-2 opacity-40" />{label}</div>; }
