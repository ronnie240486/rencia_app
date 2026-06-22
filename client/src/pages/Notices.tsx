import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Send, Trash2, AlertCircle, ArrowLeft, Moon, Sun } from "lucide-react";
import { useLocation } from "wouter";

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
    <div className="min-h-screen bg-background">
      {/* Header com botões no topo esquerdo */}
      <div className="bg-background border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2 p-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/dashboard")}
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

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

          <div className="flex-1" />

          <h1 className="text-2xl font-bold">Avisos Importantes</h1>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Formulário de aviso (apenas para admin) */}
        {isAdmin && (
          <Card className="p-6 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Criar Novo Aviso
            </h2>

            {submitted && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <span className="text-green-700 dark:text-green-300">
                  ✓ Aviso criado com sucesso!
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                  rows={5}
                  placeholder="Escreva o aviso que será exibido para todos os master e revenda..."
                  value={formData.conteudo}
                  onChange={(e) =>
                    setFormData({ ...formData, conteudo: e.target.value })
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-save"
                disabled={createNoticeMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {createNoticeMutation.isPending
                  ? "Enviando..."
                  : "Publicar Aviso"}
              </Button>
            </form>
          </Card>
        )}

        {/* Lista de avisos ativos */}
        {notices && notices.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Avisos Ativos</h2>
            {notices.map((notice: any) => (
              <Card
                key={notice.id}
                className="p-6 border-l-4 border-l-orange-500 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-700 dark:text-orange-400">
                      {notice.titulo}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notice.criadoEm).toLocaleDateString("pt-BR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-950 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap">
                  {notice.conteudo}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum aviso no momento</p>
          </Card>
        )}
      </div>
    </div>
  );
}
