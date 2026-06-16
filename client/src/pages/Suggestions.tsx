import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Send, CheckCircle, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function Suggestions() {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    sugestao: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [, setLocation] = useLocation();

  const createSuggestionMutation = trpc.suggestions.create.useMutation();
  const { data: suggestionsList } = trpc.suggestions.list.useQuery();

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
      
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sugestões de Melhorias</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/avisos")}>
              Avisos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/carousel")}>
              Carousel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/configuracoes")}>
              Configurações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Formulário de sugestão */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Envie sua Sugestão</h2>
        
        {submitted && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">Sugestão enviada com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome *</label>
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
              <label className="block text-sm font-medium mb-2">Telefone</label>
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
              Sua Sugestão *
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows={5}
              placeholder="Descreva sua sugestão de melhoria..."
              value={formData.sugestao}
              onChange={(e) =>
                setFormData({ ...formData, sugestao: e.target.value })
              }
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createSuggestionMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {createSuggestionMutation.isPending
              ? "Enviando..."
              : "Enviar Sugestão"}
          </Button>
        </form>
      </Card>

      {/* Lista de sugestões (apenas para admin) */}
      {suggestionsList && suggestionsList.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Sugestões Recebidas ({suggestionsList.length})
          </h2>
          <div className="space-y-4">
            {suggestionsList.map((suggestion: any) => (
              <div
                key={suggestion.id}
                className="p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{suggestion.nome}</h3>
                    <p className="text-sm text-gray-600">
                      {suggestion.telefone && `📱 ${suggestion.telefone}`}
                      {suggestion.email && ` • 📧 ${suggestion.email}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(suggestion.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-gray-700">{suggestion.sugestao}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
