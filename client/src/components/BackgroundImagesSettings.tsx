import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface SelectedSlide {
  slideId: number;
  urlMedia: string;
  titulo: string;
  duration: number;
}

export default function BackgroundImagesSettings() {
  const { user } = useAuth();
  const [carouselSlides, setCarouselSlides] = useState<any[]>([]);
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSlide, setNewSlide] = useState({ duration: 5, type: "image" });

  // Buscar slides do carousel
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch("/api/carousel/list");
        const data = await response.json();
        if (data.ok) {
          setCarouselSlides(data.slides);
        }
      } catch (error) {
        console.error("Erro ao buscar slides:", error);
      }
    };

    // Buscar configurações salvas
    const fetchBackgroundConfig = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`/api/background/get/${user.id}`);
        const data = await response.json();
        if (data.ok && data.backgrounds.length > 0) {
          setSelectedSlides(
            data.backgrounds.map((bg: any) => ({
              slideId: bg.slideId,
              urlMedia: bg.urlMedia,
              titulo: bg.titulo,
              duration: bg.duration,
            }))
          );
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      }
    };

    fetchSlides();
    fetchBackgroundConfig();
  }, [user?.id]);

  const handleAddSlide = (slide: any) => {
    if (selectedSlides.length >= 5) {
      toast.error("Máximo de 5 imagens permitidas");
      return;
    }

    // Verificar se já está selecionada
    if (selectedSlides.some((s) => s.slideId === slide.id)) {
      toast.error("Imagem já selecionada");
      return;
    }

    setSelectedSlides([
      ...selectedSlides,
      {
        slideId: slide.id,
        urlMedia: slide.urlMedia,
        titulo: slide.titulo,
        duration: 5,
      },
    ]);
  };

  const handleRemoveSlide = (slideId: number) => {
    setSelectedSlides(selectedSlides.filter((s) => s.slideId !== slideId));
  };

  const handleDurationChange = (slideId: number, duration: number) => {
    setSelectedSlides(
      selectedSlides.map((s) =>
        s.slideId === slideId ? { ...s, duration } : s
      )
    );
  };

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
      }

      setNewSlide({ duration: 5, type: "image" });
      e.target.value = "";
      
      // Recarregar slides
      const response = await fetch("/api/carousel/list");
      const result = await response.json();
      if (result.ok) {
        setCarouselSlides(result.slides);
      }
      
      toast.success(`${files.length} imagem(ns) adicionada(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/background/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          selectedSlides: selectedSlides.map((s) => ({
            slideId: s.slideId,
            duration: s.duration,
          })),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error(data.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload de Novas Imagens */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novas Imagens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <select
                  value={newSlide.type}
                  onChange={(e) =>
                    setNewSlide({ ...newSlide, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
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
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition">
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
        </CardContent>
      </Card>

      {/* Imagens Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens Disponíveis do Carousel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {carouselSlides.map((slide) => (
              <div
                key={slide.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-border hover:border-primary transition"
              >
                <img
                  src={slide.urlMedia}
                  alt={slide.titulo}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Button
                    size="sm"
                    onClick={() => handleAddSlide(slide)}
                    disabled={selectedSlides.length >= 5}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Imagens Selecionadas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Imagens Selecionadas ({selectedSlides.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSlides.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma imagem selecionada. Selecione de 1 a 5 imagens acima.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedSlides.map((slide, index) => (
                <div
                  key={slide.slideId}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden">
                    <img
                      src={slide.urlMedia}
                      alt={slide.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{slide.titulo}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-sm text-muted-foreground">
                        Duração (segundos):
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={slide.duration}
                        onChange={(e) =>
                          handleDurationChange(
                            slide.slideId,
                            parseInt(e.target.value) || 5
                          )
                        }
                        className="w-20"
                      />
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveSlide(slide.slideId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={loading || selectedSlides.length === 0}
          className="flex-1"
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      {/* Info */}
      <div className="bg-muted p-4 rounded-lg text-sm">
        <p className="font-medium mb-2">ℹ️ Como funciona:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Selecione 1 imagem para exibir como fundo estático</li>
          <li>Selecione 2 ou mais imagens para ativar carousel automático</li>
          <li>Defina a duração de cada imagem em segundos</li>
          <li>Clique em "Salvar Configurações" para aplicar as mudanças</li>
        </ul>
      </div>
    </div>
  );
}
