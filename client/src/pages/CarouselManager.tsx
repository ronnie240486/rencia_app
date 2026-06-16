import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Upload, Trash2, Plus } from "lucide-react";

export default function CarouselManager() {
  const [slides, setSlides] = useState<any[]>([]);
  const [newSlide, setNewSlide] = useState({ duration: 5, type: "image" });
  const [uploading, setUploading] = useState(false);

  const { data: carouselSlides } = trpc.carousel.adminList.useQuery();
  const createSlideMutation = trpc.carousel.createSlide.useMutation();
  const updateSlideMutation = trpc.carousel.updateSlide.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("duration", newSlide.duration.toString());
        formData.append("type", newSlide.type);

        const response = await fetch("/api/carousel/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.url) {
          throw new Error(`Invalid response: no URL returned for ${file.name}`);
        }
        
        await createSlideMutation.mutateAsync({
          titulo: `Slide ${file.name}`,
          tipo: newSlide.type as "image" | "video",
          urlMedia: data.url,
          ordem: (carouselSlides?.length || 0) + i + 1,
        });
      }

      setNewSlide({ duration: 5, type: "image" });
      e.target.value = "";
      // Invalidar cache para recarregar slides
      trpc.useUtils().carousel.adminList.invalidate();
      alert(`${files.length} slide(s) adicionado(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (slideId: number) => {
    try {
      const response = await fetch(`/api/carousel/delete/${slideId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        // Recarregar slides
        trpc.useUtils().carousel.adminList.invalidate();
        alert('Slide removido com sucesso!');
      } else {
        alert('Erro ao remover slide');
      }
    } catch (error) {
      console.error('Erro ao remover slide:', error);
      alert(`Erro ao remover slide: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Carousel do App</h1>
      </div>

      {/* Adicionar novo slide */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Adicionar Novo Slide</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={newSlide.type}
                onChange={(e) =>
                  setNewSlide({ ...newSlide, type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Duração (segundos)
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={newSlide.duration}
                onChange={(e) =>
                  setNewSlide({
                    ...newSlide,
                    duration: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Selecionar {newSlide.type === "image" ? "Imagem" : "Vídeo"}
            </label>
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-sm">
                  Clique para fazer upload de múltiplos arquivos
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept={newSlide.type === "image" ? "image/*" : "video/*"}
                onChange={handleFileUpload}
                disabled={uploading}
                multiple
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Lista de slides */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Slides Atuais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carouselSlides?.map((slide: any) => (
            <div key={slide.id} className="border rounded-lg overflow-hidden">
              {slide.tipo === "image" ? (
                <img
                  src={slide.urlMedia}
                  alt="Slide"
                  className="w-full h-40 object-cover"
                />
              ) : (
                <video
                  src={slide.urlMedia}
                  className="w-full h-40 object-cover"
                  controls
                />
              )}
              <div className="p-3 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {slide.tipo === "image" ? "🖼️ Imagem" : "🎬 Vídeo"} •{" "}
                  {slide.duracao}s
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => handleDelete(Number(slide.id))}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!carouselSlides?.length && (
          <p className="text-center text-gray-500 py-8">
            Nenhum slide adicionado ainda
          </p>
        )}
      </Card>
    </div>
  );
}
