import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, ExternalLink, Phone, RefreshCw, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";

interface ExpiringClient {
  nome: string | null;
  telefone: string | null;
  vencimento: string;
  dias: number;
  waUrl: string;
}

export default function Chatbot() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ExpiringClient[] | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [totalSent, setTotalSent] = useState<number | null>(null);

  const diasAviso = parseInt(settings?.chatbot_dias_aviso ?? "3") || 3;

  const handleCheck = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/chatbot/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dias: diasAviso }),
      });
      const data = await resp.json() as {
        sent?: number;
        message?: string;
        links?: ExpiringClient[];
      };
      if (resp.ok) {
        setClients(data.links ?? []);
        setTotalSent(data.sent ?? 0);
        setLastCheck(new Date().toLocaleString("pt-BR"));
        if ((data.sent ?? 0) === 0) {
          toast.info("Nenhum cliente vence nos próximos " + diasAviso + " dia(s) com telefone cadastrado.");
        } else {
          toast.success(`${data.sent} cliente(s) encontrado(s)! Clique nos links para enviar via WhatsApp.`);
        }
      } else {
        toast.error(data.message || "Erro ao buscar clientes");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getDiasBadgeVariant = (dias: number) => {
    if (dias <= 1) return "destructive";
    if (dias <= 3) return "secondary";
    return "outline";
  };

  const getDiasBadgeLabel = (dias: number) => {
    if (dias === 0) return "VENCE HOJE";
    if (dias === 1) return "AMANHÃ";
    return `${dias} dias`;
  };

  return (
    <AdminLayout title="Chatbot de Avisos">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Chatbot de Avisos de Vencimento</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clientes com vencimento nos próximos <strong>{diasAviso} dia(s)</strong> e telefone cadastrado.
            </p>
          </div>
          <Button onClick={handleCheck} disabled={loading} className="gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Verificar Agora
          </Button>
        </div>

        {/* Info */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-4 text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p><strong>Como usar:</strong> Clique em "Verificar Agora" para buscar clientes que vencem em breve.</p>
            <p>Para cada cliente com telefone cadastrado, um link do WhatsApp é gerado com a mensagem configurada.</p>
            <p>Clique em <strong>"Abrir WhatsApp"</strong> para enviar a mensagem diretamente.</p>
            <p className="text-xs opacity-75">Configure a mensagem e os dias de aviso em <strong>Configurações → Chatbot</strong>.</p>
          </CardContent>
        </Card>

        {/* Resultados */}
        {clients !== null && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle size={16} />
                  {totalSent === 0
                    ? "Nenhum cliente encontrado"
                    : `${totalSent} cliente(s) vencendo em breve`}
                </CardTitle>
                {lastCheck && (
                  <span className="text-xs text-muted-foreground">Verificado: {lastCheck}</span>
                )}
              </div>
              {totalSent !== null && totalSent > 0 && (
                <CardDescription>
                  Clique em "Abrir WhatsApp" para enviar a mensagem de aviso para cada cliente.
                </CardDescription>
              )}
            </CardHeader>

            {clients.length > 0 && (
              <CardContent>
                <div className="space-y-3">
                  {clients.map((client, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone size={16} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{client.nome || "—"}</p>
                          <p className="text-xs text-muted-foreground">{client.telefone || "—"}</p>
                          <p className="text-xs text-muted-foreground">Vence: {client.vencimento}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={getDiasBadgeVariant(client.dias) as any}>
                          {getDiasBadgeLabel(client.dias)}
                        </Badge>
                        <a
                          href={client.waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="gap-1.5 h-8 text-xs">
                            <ExternalLink size={12} />
                            Abrir WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}

            {clients.length === 0 && (
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageCircle size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum cliente vence nos próximos {diasAviso} dia(s)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ou os clientes não têm telefone cadastrado. Edite os clientes para adicionar o telefone.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Aviso sem telefone */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p><strong>Clientes sem telefone</strong> não aparecem na lista acima.</p>
                <p className="text-xs mt-1">Vá em <strong>Usuários → Editar</strong> para adicionar o telefone de cada cliente.</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
