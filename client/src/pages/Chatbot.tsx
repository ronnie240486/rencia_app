import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageCircle, ExternalLink, Phone, RefreshCw, AlertTriangle, Building2, Copy, Pencil, Save, Trash2 } from "lucide-react";
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
  const { data: notices = [] } = trpc.notices.list.useQuery(undefined, { refetchInterval: 15_000 });
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingRevendas, setLoadingRevendas] = useState(false);
  const [clients, setClients] = useState<ExpiringItem[] | null>(null);
  const [revendas, setRevendas] = useState<ExpiringItem[] | null>(null);
  const [lastCheckClientes, setLastCheckClientes] = useState<string | null>(null);
  const [lastCheckRevendas, setLastCheckRevendas] = useState<string | null>(null);
  const [totalClientes, setTotalClientes] = useState<number | null>(null);
  const [totalRevendas, setTotalRevendas] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<"renewal" | "collection" | "welcome" | "maintenance" | "custom">("renewal");
  const [templateContent, setTemplateContent] = useState("");
  const utils = trpc.useUtils();
  const templatesQuery = trpc.messageTemplates.list.useQuery();
  const resetTemplateForm = () => { setTemplateId(null); setTemplateName(""); setTemplateCategory("renewal"); setTemplateContent(""); };
  const saveTemplate = trpc.messageTemplates.create.useMutation({ onSuccess: async () => { await utils.messageTemplates.list.invalidate(); toast.success("Modelo salvo."); resetTemplateForm(); } });
  const updateTemplate = trpc.messageTemplates.update.useMutation({ onSuccess: async () => { await utils.messageTemplates.list.invalidate(); toast.success("Modelo atualizado."); resetTemplateForm(); } });
  const removeTemplate = trpc.messageTemplates.remove.useMutation({ onSuccess: async () => { await utils.messageTemplates.list.invalidate(); toast.success("Modelo removido."); if (templateId) resetTemplateForm(); } });
  const applyTemplate = trpc.messageTemplates.applyToExpiration.useMutation({ onSuccess: async () => { await utils.settings.getAll.invalidate(); toast.success("Modelo aplicado ao aviso de vencimento."); } });

  const diasAviso = parseInt(settings?.chatbot_dias_aviso ?? "3") || 3;
  const automaticNotices = notices.filter((notice) => notice.titulo === "Aviso de Vencimento");
  const handleTemplateSave = () => {
    if (!templateName.trim() || !templateContent.trim()) return toast.error("Informe o nome e o conteúdo do modelo.");
    const data = { name: templateName.trim(), category: templateCategory, content: templateContent.trim() };
    if (templateId) updateTemplate.mutate({ id: templateId, ...data }); else saveTemplate.mutate(data);
  };
  const editTemplate = (template: NonNullable<typeof templatesQuery.data>[number]) => { setTemplateId(template.id); setTemplateName(template.name); setTemplateCategory(template.category); setTemplateContent(template.content); };

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

  const handleOpenAllWhatsApp = (items: ExpiringItem[]) => {
    if (items.length === 0) {
      toast.info("Não há avisos para enviar.");
      return;
    }

    const confirmed = window.confirm(
      `Abrir ${items.length} conversa(s) do WhatsApp com as mensagens prontas? Você só precisará confirmar o envio no WhatsApp.`,
    );
    if (!confirmed) return;

    items.forEach((item) => window.open(item.waUrl, "_blank", "noopener,noreferrer"));
    toast.success(`${items.length} conversa(s) foram abertas com os avisos prontos.`);
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
        <Button onClick={onCheck} disabled={loading} className="gap-2 text-black dark:text-white [&_svg]:text-current">
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <CardDescription>
                  Use o envio em massa para abrir todos os avisos de uma vez.
                </CardDescription>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenAllWhatsApp(items)}
                  className="gap-1.5 text-black dark:text-white [&_svg]:text-current"
                >
                  <MessageCircle size={14} />
                  Enviar para Todos
                </Button>
              </div>
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
            Avisos são criados automaticamente quando um cliente fica a um dia do vencimento.
          </p>
        </div>

        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-600" />
              Avisos Automáticos
              <Badge variant="secondary">{automaticNotices.length}</Badge>
            </CardTitle>
            <CardDescription>
              Esta lista é atualizada automaticamente; não é necessário clicar em “Verificar Agora”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {automaticNotices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente com vencimento para amanhã no momento.</p>
            ) : (
              <div className="space-y-2">
                {automaticNotices.map((notice) => (
                  <div key={notice.id} className="rounded-lg border border-amber-200 dark:border-amber-800 p-3 bg-background/70">
                    <p className="font-medium text-sm">{notice.titulo}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notice.conteudo}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle size={17} /> Modelos de Mensagens</CardTitle>
            <CardDescription>Use <code>{"{nome}"}</code>, <code>{"{dias}"}</code> e <code>{"{data}"}</code> nos modelos de vencimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <label className="grid gap-1.5 text-sm font-medium">Nome do modelo<Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Ex.: Renovação mensal" /></label>
              <label className="grid gap-1.5 text-sm font-medium">Categoria<select value={templateCategory} onChange={(event) => setTemplateCategory(event.target.value as typeof templateCategory)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="renewal">Renovação</option><option value="collection">Cobrança</option><option value="welcome">Boas-vindas</option><option value="maintenance">Manutenção</option><option value="custom">Personalizado</option></select></label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">Mensagem<Textarea value={templateContent} onChange={(event) => setTemplateContent(event.target.value)} rows={4} placeholder="Digite a mensagem que deseja reutilizar" /></label>
            <div className="flex flex-wrap gap-2"><Button onClick={handleTemplateSave} disabled={saveTemplate.isPending || updateTemplate.isPending} className="gap-2 text-black dark:text-white"><Save size={15} /> {templateId ? "Salvar alterações" : "Salvar modelo"}</Button>{templateId && <Button variant="outline" onClick={resetTemplateForm}>Cancelar edição</Button>}</div>
            <div className="space-y-2 border-t pt-4">
              {templatesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando modelos…</p> : templatesQuery.data?.map((template) => <div key={template.id} className="rounded-lg border p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-sm">{template.name}</p><Badge variant="secondary" className="text-xs">{template.category}</Badge></div><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{template.content}</p></div><div className="flex shrink-0 flex-wrap gap-1"><Button size="sm" variant="outline" title="Copiar" onClick={() => { navigator.clipboard.writeText(template.content); toast.success("Modelo copiado."); }}><Copy size={14} /></Button><Button size="sm" variant="outline" title="Editar" onClick={() => editTemplate(template)}><Pencil size={14} /></Button><Button size="sm" variant="outline" onClick={() => applyTemplate.mutate({ id: template.id })}>Usar no vencimento</Button><Button size="sm" variant="ghost" className="text-destructive" title="Remover" onClick={() => { if (window.confirm(`Remover o modelo ${template.name}?`)) removeTemplate.mutate({ id: template.id }); }}><Trash2 size={14} /></Button></div></div></div>)}</div>
          </CardContent>
        </Card>

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
