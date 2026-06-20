import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Send, Trash2, AlertCircle, Moon, Sun } from "lucide-react";
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

export default function Notices() {
  const { data: user } = trpc.auth.me.useQuery();
  const [formData, setFormData] = useState({
    titulo: "",
    conteudo: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const createNoticeMutation = trpc.notices.create.useMutation();
  const deleteNoticeMutation = trpc.notices.delete.useMutation();
  const { data: notices, refetch } = trpc.notices.list.useQuery();

  const isAdmin = user?.role === "admin" || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert("Apenas administradores podem criar avisos");
      return;
    }

    try {
      await createNoticeMutation.mutateAsync({
        titulo: formData.titulo,
        conteudo: formData.conteudo,
      });

      setSubmitted(true);
      setFormData({ titulo: "", conteudo: "" });
      refetch();

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao criar aviso:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este aviso?")) return;

    try {
      await deleteNoticeMutation.mutateAsync({ id });
      refetch();
    } catch (error) {
      console.error("Erro ao deletar aviso:", error);
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
              <h1 className="text-2xl font-bold">Avisos Importantes</h1>
              
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

                <SidebarTrigger />
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Formulário de aviso (apenas para admin) */}
            {isAdmin && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Publicar Aviso</h2>

                {submitted && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300">
                      Aviso publicado com sucesso!
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Título *
                    </label>
                    <Input
                      type="text"
                      placeholder="Título do aviso"
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Conteúdo *
                    </label>
                    <textarea
                      placeholder="Conteúdo do aviso..."
                      value={formData.conteudo}
                      onChange={(e) =>
                        setFormData({ ...formData, conteudo: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={5}
                    />
                  </div>

                  <Button type="submit" className="gap-2 btn-secondary">
                    <Send size={16} />
                    Publicar Aviso
                  </Button>
                </form>
              </Card>
            )}

            {/* Lista de avisos */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Avisos</h2>
              {notices && notices.length > 0 ? (
                <div className="space-y-4">
                  {notices.map((notice: any) => (
                    <div key={notice.id} className="p-4 border border-border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{notice.titulo}</h3>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notice.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(notice.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm">{notice.conteudo}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum aviso publicado</p>
              )}
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
