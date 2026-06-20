import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Send, CheckCircle, Moon, Sun, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function Suggestions() {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    sugestao: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const createSuggestionMutation = trpc.suggestions.create.useMutation();
  const deleteSuggestionMutation = trpc.suggestions.delete.useMutation();
  const { data: suggestionsList, refetch } = trpc.suggestions.list.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSuggestionMutation.mutateAsync({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        sugestao: formData.sugestao,
      });

      setSubmitted(true);
      setFormData({ nome: "", telefone: "", email: "", sugestao: "" });
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar esta sugestão?")) return;

    try {
      await deleteSuggestionMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      console.error("Erro ao deletar sugestão:", error);
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <SidebarProvider defaultOpen={sidebarOpen} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar>
        <SidebarHeader className="flex items-center justify-center py-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">OURO PRO</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/dashboard"); setSidebarOpen(false); }}>
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/users"); setSidebarOpen(false); }}>
                Usuários
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/user-create"); setSidebarOpen(false); }}>
                Cadastrar Usuário
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/revendas"); setSidebarOpen(false); }}>
                Revendas
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/chatbot"); setSidebarOpen(false); }}>
                Chatbot de Avisos
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/dns"); setSidebarOpen(false); }}>
                DNS
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/loja"); setSidebarOpen(false); }}>
                Loja
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/suggestions"); setSidebarOpen(false); }}>
                Sugestões
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/notices"); setSidebarOpen(false); }}>
                Avisos
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => { setLocation("/settings"); setSidebarOpen(false); }}>
                Configurações do App
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="min-h-screen bg-background">
          {/* Header com menu */}
          <div className="bg-background border-b border-border sticky top-0 z-50">
            <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
              </div>
              <h1 className="text-2xl font-bold">Sugestões de Melhorias</h1>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  title={isDark ? "Modo claro" : "Modo escuro"}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Formulário de sugestão */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Envie sua Sugestão</h2>

              {submitted && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300">
                    Sugestão enviada com sucesso!
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome *
                    </label>
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      placeholder="(XX) XXXXX-XXXX"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sugestão *
                  </label>
                  <textarea
                    placeholder="Descreva sua sugestão..."
                    value={formData.sugestao}
                    onChange={(e) =>
                      setFormData({ ...formData, sugestao: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={5}
                  />
                </div>

                <Button type="submit" className="gap-2 btn-secondary">
                  <Send size={16} />
                  Enviar Sugestão
                </Button>
              </form>
            </Card>

            {/* Lista de sugestões */}
            {suggestionsList && suggestionsList.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Sugestões Recentes</h2>
                <div className="space-y-4">
                  {suggestionsList.map((suggestion: any, idx: number) => (
                    <div key={idx} className="p-4 border border-border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{suggestion.nome}</h3>
                        <div className="flex gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(suggestion.created_at).toLocaleDateString()}
                          </span>
                          {suggestion.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(suggestion.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.email}
                      </p>
                      <p className="text-sm">{suggestion.sugestao}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
