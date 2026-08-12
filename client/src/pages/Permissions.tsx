import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function Permissions() {
  const policy = trpc.accessControl.policy.useQuery();
  const data = policy.data;
  return <AdminLayout title="Permissões"><div className="space-y-6"><div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-primary"><ShieldCheck size={17} /> Acesso controlado</div><h1 className="text-2xl font-bold">Permissões do painel</h1><p className="mt-1 text-sm text-muted-foreground">Cada perfil vê e administra somente o que está autorizado no seu nível de acesso.</p></div><Card className="border-primary/30"><CardHeader><CardTitle className="text-base">Seu perfil atual</CardTitle><CardDescription>As permissões abaixo são aplicadas no backend, não apenas escondidas na tela.</CardDescription></CardHeader><CardContent><Badge className="text-sm">{data?.role || "Carregando…"}</Badge></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Matriz de permissões</CardTitle></CardHeader><CardContent className="space-y-3">{data?.scopes.map(scope => <div key={scope.area} className="flex gap-3 rounded-xl border p-4"><div className={scope.allowed ? "text-emerald-600" : "text-muted-foreground"}>{scope.allowed ? <CheckCircle2 size={19} /> : <LockKeyhole size={19} />}</div><div><p className="font-medium">{scope.area}</p><p className="mt-1 text-sm text-muted-foreground">{scope.detail}</p></div></div>)}</CardContent></Card></div></AdminLayout>;
}
