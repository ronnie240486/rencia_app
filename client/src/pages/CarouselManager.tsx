import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export function CarouselManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo: "image" as "image" | "video",
    urlMedia: "",
    ordem: 0,
  });

  const [configData, setConfigData] = useState({
    autoplay: true,
    autoplayInterval: 5000,
    impactPhrase: "O melhor IPTV sempre",
    contactPhrase: "Contate seu revenda",
    legalNotice: "OuroPro is a media player application. The app does not provide or include any media or content.",
  });

  // Queries
  const slidesQuery = trpc.carousel.adminList.useQuery();
  const configQuery = trpc.carousel.config.useQuery();

  // Mutations
  const createMutation = trpc.carousel.createSlide.useMutation({
    onSuccess: () => {
      toast.success("Slide criado com sucesso!");
      slidesQuery.refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.carousel.updateSlide.useMutation({
    onSuccess: () => {
      toast.success("Slide atualizado com sucesso!");
      slidesQuery.refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.carousel.deleteSlide.useMutation({
    onSuccess: () => {
      toast.success("Slide deletado com sucesso!");
      slidesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateConfigMutation = trpc.carousel.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas!");
      configQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "image",
      urlMedia: "",
      ordem: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.urlMedia) {
      toast.error("Título e URL são obrigatórios");
      return;
    }

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (slide: any) => {
    setFormData({
      titulo: slide.titulo,
      descricao: slide.descricao || "",
      tipo: slide.tipo,
      urlMedia: slide.urlMedia,
      ordem: slide.ordem,
    });
    setEditingId(slide.id);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este slide?")) {
      deleteMutation.mutate({ id });
    }
  };

  const slides = slidesQuery.data || [];
  const isLoading = slidesQuery.isLoading || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciador de Carousel</h1>
        <p className="text-gray-600">Gerencie os slides de imagens e vídeos do app OuroPro</p>
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Carousel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Auto-play (segundos)</label>
              <Input
                type="number"
                value={configData.autoplayInterval / 1000}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    autoplayInterval: parseInt(e.target.value) * 1000,
                  })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => updateConfigMutation.mutate(configData)}
                disabled={updateConfigMutation.isPending}
              >
                {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Frase de Impacto</label>
            <Input
              value={configData.impactPhrase}
              onChange={(e) =>
                setConfigData({ ...configData, impactPhrase: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Frase de Contato</label>
            <Input
              value={configData.contactPhrase}
              onChange={(e) =>
                setConfigData({ ...configData, contactPhrase: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Aviso Legal</label>
            <Textarea
              value={configData.legalNotice}
              onChange={(e) =>
                setConfigData({ ...configData, legalNotice: e.target.value })
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Slides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Slides ({slides.length})</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Slide
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Slide" : "Criar Novo Slide"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    placeholder="Ex: Promoção de Verão"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    placeholder="Descrição opcional"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tipo *</label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: "image" | "video") =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">URL da Mídia *</label>
                  <Input
                    value={formData.urlMedia}
                    onChange={(e) =>
                      setFormData({ ...formData, urlMedia: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Ordem</label>
                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) =>
                      setFormData({ ...formData, ordem: parseInt(e.target.value) })
                    }
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {slidesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : slides.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum slide criado ainda</p>
          ) : (
            <div className="space-y-2">
              {slides.map((slide: any) => (
                <div
                  key={slide.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{slide.titulo}</h3>
                    <p className="text-sm text-gray-600">
                      {slide.tipo === "image" ? "🖼️ Imagem" : "🎬 Vídeo"} • Ordem: {slide.ordem}
                    </p>
                    {slide.descricao && (
                      <p className="text-sm text-gray-500 mt-1">{slide.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(slide)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(slide.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
