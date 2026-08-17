import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_CONFIGURATION_FEATURES, MANAGED_APP_CATALOG } from "@shared/appCatalog";
import { ArrowRight, Box, Image, MessageSquare, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Link } from "wouter";

const featureLabels: Record<(typeof APP_CONFIGURATION_FEATURES)[number], string> = {
  logo: "Logo",
  banner: "Banner",
  background: "Fundo",
  message: "Mensagens",
  content_icons: "Ícones",
  playlist: "Listas",
  mac_integration: "MAC",
  updates: "Atualização",
};

const appIcons = {
  ouropro: ShieldCheck,
  fusion: Image,
  maximus: Smartphone,
};

export default function AppsHub() {
  const apps = Object.values(MANAGED_APP_CATALOG);

  return (
    <AdminLayout title="Aplicativos">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><Box size={16} /> Central de aplicativos</div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Um padrão para todos os seus aplicativos</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Cada aplicativo usa a mesma base de imagens, mensagens, listas, integração por MAC e atualização. Ao informar o próximo nome, ele será incluído neste catálogo sem perder esse padrão.</p>
            </div>
            <Badge variant="secondary" className="w-fit">{apps.length} aplicativos configurados</Badge>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {apps.map((app) => {
            const Icon = appIcons[app.id];
            return (
              <Card key={app.id} className="flex flex-col border-border/80 transition-shadow hover:shadow-md">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon size={22} /></div><Badge variant="outline">Pronto</Badge></div>
                  <div><CardTitle>{app.displayName}</CardTitle><CardDescription className="mt-1">Configurações, integração e atualização preservadas.</CardDescription></div>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="flex flex-wrap gap-1.5">{APP_CONFIGURATION_FEATURES.map((feature) => <Badge key={feature} variant="secondary" className="font-normal">{featureLabels[feature]}</Badge>)}</div>
                  <Link href={app.settingsRoute}><Button className="w-full gap-2">Abrir configurações <ArrowRight size={16} /></Button></Link>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Próximo aplicativo</p><p className="mt-1 text-sm text-muted-foreground">Envie o nome quando estiver pronto. A nova entrada receberá esta mesma estrutura de recursos.</p></div>
            <Badge variant="outline" className="w-fit"><RefreshCw size={14} className="mr-1.5" /> Aguardando nome</Badge>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
