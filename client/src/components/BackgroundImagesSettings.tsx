import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  const [selectedForAdd, setSelectedForAdd] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

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

  const handleToggleSlide = (slideId: number) => {
    const newSet = new Set(selectedForAdd);
    if (newSet.has(slideId)) {
      newSet.delete(slideId);
    } else {
      newSet.add(slideId);
    }
    setSelectedForAdd(newSet);
  };

  const handleAddSelected = () => {
    if (selectedForAdd.size === 0) {
      toast.error("Selecione pelo menos 1 imagem");
      return;
    }

    if (selectedSlides.length + selectedForAdd.size > 5) {
      toast.error(`Máximo de 5 imagens permitidas. Você tem ${selectedSlides.length} selecionadas.`);
      return;
    }

    const newSlides = carouselSlides
      .filter((slide) => selectedForAdd.has(slide.id))
      .map((slide) => ({
        slideId: slide.id,
        urlMedia: slide.urlMedia,
        titulo: slide.titulo,
        duration: 5,
      }));

    setSelectedSlides([...selectedSlides, ...newSlides]);
    setSelectedForAdd(new Set());
    toast.success(`${newSlides.length} imagem(ns) adicionada(s)`);
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
      {/* Imagens Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens Disponíveis do Carousel</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione as imagens que deseja usar (máximo 5)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {carouselSlides.map((slide) => (
              <div
                key={slide.id}
                className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition"
              >
                <img
                  src={slide.urlMedia}
                  alt={slide.titulo}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedForAdd.has(slide.id)}
                    onCheckedChange={() => handleToggleSlide(slide.id)}
                    disabled={selectedSlides.length + selectedForAdd.size >= 5 && !selectedForAdd.has(slide.id)}
                  />
                </div>
              </div>
            ))}
          </div>
          {carouselSlides.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma imagem disponível no carousel
            </p>
          )}

          {selectedForAdd.size > 0 && (
            <Button
              onClick={handleAddSelected}
              className="w-full"
            >
              Adicionar {selectedForAdd.size} Imagem{selectedForAdd.size > 1 ? "ns" : ""}
            </Button>
          )}
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
              Nenhuma imagem selecionada. Selecione acima e clique "Adicionar".
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
