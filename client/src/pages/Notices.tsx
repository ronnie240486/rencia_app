import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Send, Trash2, AlertCircle } from "lucide-react";
export default function Notices() {
  const { data: user } = trpc.auth.me.useQuery();
  const [formData, setFormData] = useState({
    titulo: "",
    conteudo: "",
  });
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Avisos Importantes</h1>
      </div>

      {/* Formulário de aviso (apenas para admin) */}
      {isAdmin && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Criar Novo Aviso
          </h2>
          
          {submitted && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <span className="text-green-700">✓ Aviso criado com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Título *</label>
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
              <label className="block text-sm font-medium mb-2">Conteúdo *</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full"
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
            <Card key={notice.id} className="p-6 border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-700">
                    {notice.titulo}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
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
                    className="p-2 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {notice.conteudo}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum aviso no momento</p>
        </Card>
      )}
    </div>
  );
}
