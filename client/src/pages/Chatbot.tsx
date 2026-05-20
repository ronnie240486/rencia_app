import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageCircle, ExternalLink, Phone, RefreshCw, AlertTriangle, Building2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";

interface ExpiringItem {
  nome: string | null;
  telefone: string | null;
  vencimento: string;
  dias: number;
  waUrl: string;
}

export default function Chatbot() {
  const { data: settings } = trpc.settings.getAll.useQuery();
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingRevendas, setLoadingRevendas] = useState(false);
  const [clients, setClients] = useState<ExpiringItem[] | null>(null);
  const [revendas, setRevendas] = useState<ExpiringItem[] | null>(null);
  const [lastCheckClientes, setLastCheckClientes] = useState<string | null>(null);
  const [lastCheckRevendas, setLastCheckRevendas] = useState<string | null>(null);
  const [totalClientes, setTotalClientes] = useState<number | null>(null);
  const [totalRevendas, setTotalRevendas] = useState<number | null>(null);

  const diasAviso = parseInt(settings?.chatbot_dias_aviso ?? "3") || 3;

  const handleCheckClientes = async () => {
    setLoadingClientes(true);
    try {
      const resp = await fetch("/api/chatbot/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dias: diasAviso }),
      });
      const data = await resp.json() as { sent?: number; message?: string; links?: ExpiringItem[] };
      if (resp.ok) {
        setClients(data.links ?? []);
        setTotalClientes(data.sent ?? 0);
        setLastCheckClientes(new Date().toLocaleString("pt-BR"));
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
      setLoadingClientes(false);
    }
  };

  const handleCheckRevendas = async () => {
    setLoadingRevendas(true);
    try {
      const resp = await fetch("/api/chatbot/revendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dias: diasAviso }),
      });
      const data = await resp.json() as { sent?: number; message?: string; links?: ExpiringItem[] };
      if (resp.ok) {
        setRevendas(data.links ?? []);
        setTotalRevendas(data.sent ?? 0);
        setLastCheckRevendas(new Date().toLocaleString("pt-BR"));
        if ((data.sent ?? 0) === 0) {
          toast.info("Nenhuma revenda vence nos próximos " + diasAviso + " dia(s) com telefone cadastrado.");
        } else {
          toast.success(`${data.sent} revenda(s) encontrada(s)! Clique nos links para enviar via WhatsApp.`);
        }
      } else {
        toast.error(data.message || "Erro ao buscar revendas");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoadingRevendas(false);
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

  const renderList = (items: ExpiringItem[], total: number, lastCheck: string | null, loading: boolean, onCheck: () => void, tipo: "cliente" | "revenda") => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {tipo === "cliente"
              ? <>Clientes com vencimento nos próximos <strong>{diasAviso} dia(s)</strong> e telefone cadastrado.</>
              : <>Revendas com plano vencendo nos próximos <strong>{diasAviso} dia(s)</strong> e telefone cadastrado.</>
            }
          </p>
        </div>
        <Button onClick={onCheck} disabled={loading} className="gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Verificar Agora
        </Button>
      </div>

      {/* Info */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-4 text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p><strong>Como usar:</strong> Clique em "Verificar Agora" para buscar {tipo === "cliente" ? "clientes" : "revendas"} que vencem em breve.</p>
          <p>Para cada {tipo === "cliente" ? "cliente" : "revenda"} com telefone cadastrado, um link do WhatsApp é gerado com a mensagem configurada.</p>
          <p>Clique em <strong>"Abrir WhatsApp"</strong> para enviar a mensagem diretamente.</p>
          {tipo === "revenda" && (
            <p className="text-xs font-semibold opacity-90">⚠️ Ao deletar uma revenda do painel, todos os seus clientes são bloqueados automaticamente.</p>
          )}
          <p className="text-xs opacity-75">Configure a mensagem e os dias de aviso em <strong>Configurações → Chatbot</strong>.</p>
        </CardContent>
      </Card>

      {/* Resultados */}
      {items !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {tipo === "cliente" ? <MessageCircle size={16} /> : <Building2 size={16} />}
                {total === 0
                  ? `Nenhum${tipo === "revenda" ? "a" : ""} ${tipo} encontrado${tipo === "revenda" ? "a" : ""}`
                  : `${total} ${tipo}(s) vencendo em breve`}
              </CardTitle>
              {lastCheck && (
                <span className="text-xs text-muted-foreground">Verificado: {lastCheck}</span>
              )}
            </div>
            {total > 0 && (
              <CardDescription>
                Clique em "Abrir WhatsApp" para enviar a mensagem de aviso.
              </CardDescription>
            )}
          </CardHeader>

          {items.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {tipo === "cliente" ? <Phone size={16} className="text-primary" /> : <Building2 size={16} className="text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{item.telefone || "—"}</p>
                        <p className="text-xs text-muted-foreground">Vence: {item.vencimento}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getDiasBadgeVariant(item.dias) as any}>
                        {getDiasBadgeLabel(item.dias)}
                      </Badge>
                      <a href={item.waUrl} target="_blank" rel="noopener noreferrer">
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

          {items.length === 0 && (
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageCircle size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhum{tipo === "revenda" ? "a" : ""} {tipo} vence nos próximos {diasAviso} dia(s)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ou {tipo === "cliente" ? "os clientes não têm" : "as revendas não têm"} telefone cadastrado.
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
              <p><strong>{tipo === "cliente" ? "Clientes" : "Revendas"} sem telefone</strong> não aparecem na lista acima.</p>
              <p className="text-xs mt-1">
                Vá em <strong>{tipo === "cliente" ? "Usuários → Editar" : "Revendas → Editar"}</strong> para adicionar o telefone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AdminLayout title="Chatbot de Avisos">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Chatbot de Avisos de Vencimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie avisos automáticos via WhatsApp para clientes e revendas antes do vencimento.
          </p>
        </div>

        <Tabs defaultValue="clientes">
          <TabsList className="w-full">
            <TabsTrigger value="clientes" className="flex-1 gap-2">
              <Phone size={14} /> Clientes
              {totalClientes !== null && totalClientes > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">{totalClientes}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="revendas" className="flex-1 gap-2">
              <Building2 size={14} /> Revendas
              {totalRevendas !== null && totalRevendas > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">{totalRevendas}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="mt-4">
            {renderList(clients ?? [], totalClientes ?? 0, lastCheckClientes, loadingClientes, handleCheckClientes, "cliente")}
          </TabsContent>

          <TabsContent value="revendas" className="mt-4">
            {renderList(revendas ?? [], totalRevendas ?? 0, lastCheckRevendas, loadingRevendas, handleCheckRevendas, "revenda")}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
