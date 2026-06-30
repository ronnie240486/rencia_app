import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Film, Tv, BookOpen, Smile } from "lucide-react";
import { toast } from "sonner";

export default function ContentSuggestions() {
  const [activeTab, setActiveTab] = useState<"filme" | "serie" | "novela" | "desenho">("filme");
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    urlCapa: "",
    urlTrailer: "",
    genero: "",
    ano: new Date().getFullYear(),
    classificacao: "12+",
    duracao: 0,
  });

  const { data: suggestions, refetch } = trpc.contentSuggestions.list.useQuery({ tipo: activeTab });
  const createMutation = trpc.contentSuggestions.create.useMutation();
  const deleteMutation = trpc.contentSuggestions.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    try {
      await createMutation.mutateAsync({
        tipo: activeTab,
        ...formData,
      });
      toast.success("Sugestão criada com sucesso!");
      setFormData({
        titulo: "",
        descricao: "",
        urlCapa: "",
        urlTrailer: "",
        genero: "",
        ano: new Date().getFullYear(),
        classificacao: "12+",
        duracao: 0,
      });
      refetch();
    } catch (error) {
      toast.error("Erro ao criar sugestão");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja deletar esta sugestão?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Sugestão deletada com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao deletar sugestão");
    }
  };

  const getIcon = () => {
    switch (activeTab) {
      case "filme": return <Film className="w-5 h-5" />;
      case "serie": return <Tv className="w-5 h-5" />;
      case "novela": return <BookOpen className="w-5 h-5" />;
      case "desenho": return <Smile className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case "filme": return "Filmes Sugeridos";
      case "serie": return "Séries Sugeridas";
      case "novela": return "Novelas Sugeridas";
      case "desenho": return "Desenhos Sugeridos";
    }
  };

  return (
    <AdminLayout title="Sugestões de Conteúdo">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {getIcon()}
          <h1 className="text-3xl font-bold">{getTitle()}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="filme">Filmes</TabsTrigger>
            <TabsTrigger value="serie">Séries</TabsTrigger>
            <TabsTrigger value="novela">Novelas</TabsTrigger>
            <TabsTrigger value="desenho">Desenhos</TabsTrigger>
          </TabsList>

          {["filme", "serie", "novela", "desenho"].map((tipo) => (
            <TabsContent key={tipo} value={tipo} className="space-y-6">
              {/* Formulário de criação */}
              <Card>
                <CardHeader>
                  <CardTitle>Adicionar Nova Sugestão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Título"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                  <Input
                    placeholder="Descrição"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  />
                  <Input
                    placeholder="URL da Capa"
                    value={formData.urlCapa}
                    onChange={(e) => setFormData({ ...formData, urlCapa: e.target.value })}
                  />
                  <Input
                    placeholder="URL do Trailer"
                    value={formData.urlTrailer}
                    onChange={(e) => setFormData({ ...formData, urlTrailer: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Gênero"
                      value={formData.genero}
                      onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Ano"
                      value={formData.ano}
                      onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Classificação (ex: 12+)"
                      value={formData.classificacao}
                      onChange={(e) => setFormData({ ...formData, classificacao: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Duração (minutos)"
                      value={formData.duracao}
                      onChange={(e) => setFormData({ ...formData, duracao: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Sugestão
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de sugestões */}
              <div className="grid gap-4">
                {suggestions?.map((suggestion) => (
                  <Card key={suggestion.id}>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {suggestion.urlCapa && (
                          <img
                            src={suggestion.urlCapa}
                            alt={suggestion.titulo}
                            className="w-24 h-32 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{suggestion.titulo}</h3>
                          {suggestion.descricao && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {suggestion.descricao}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-500">
                            {suggestion.genero && <span>Gênero: {suggestion.genero}</span>}
                            {suggestion.ano && <span>Ano: {suggestion.ano}</span>}
                            {suggestion.classificacao && <span>Classificação: {suggestion.classificacao}</span>}
                            {suggestion.duracao && <span>Duração: {suggestion.duracao}min</span>}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(suggestion.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!suggestions || suggestions.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-gray-500">
                    Nenhuma sugestão adicionada ainda
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
