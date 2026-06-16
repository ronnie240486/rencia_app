import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, Play, Pause } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface SelectedSlide {
  slideId: number;
  urlMedia: string;
  titulo: string;
}

export default function BackgroundImagesSettings() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselSlides, setCarouselSlides] = useState<any[]>([]);
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);

  useEffect(() => {
    fetchSlides();
    if (user?.id) {
      fetchBackgroundConfig();
    }
  }, [user?.id]);

  // Auto-play carousel preview
  useEffect(() => {
    if (!isPlayingPreview || selectedSlides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % selectedSlides.length);
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [isPlayingPreview, selectedSlides.length]);

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

  const fetchBackgroundConfig = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/background/get/${user.id}`);
      const data = await response.json();
      if (data.ok && data.backgrounds && data.backgrounds.length > 0) {
        setSelectedSlides(
          data.backgrounds.map((bg: any) => ({
            slideId: bg.slideId,
            urlMedia: bg.urlMedia,
            titulo: bg.titulo,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("titulo", file.name.replace(/\.[^/.]+$/, ""));

        const response = await fetch("/api/carousel/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.ok) {
          toast.success(`${file.name} enviado!`);
        } else {
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
      await fetchSlides();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleToggleSlide = (slide: any) => {
    const isSelected = selectedSlides.some((s) => s.slideId === slide.id);

    if (isSelected) {
      setSelectedSlides(selectedSlides.filter((s) => s.slideId !== slide.id));
    } else {
      setSelectedSlides([
        ...selectedSlides,
        {
          slideId: slide.id,
          urlMedia: slide.urlMedia,
          titulo: slide.titulo,
        },
      ]);
    }
  };

  const handleRemoveSlide = (slideId: number) => {
    setSelectedSlides(selectedSlides.filter((s) => s.slideId !== slideId));
  };

  const handleDeleteSlide = async (slideId: number) => {
    if (!confirm("Tem certeza que deseja deletar esta imagem?")) return;

    try {
      const response = await fetch(`/api/carousel/delete/${slideId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Imagem deletada com sucesso!");
        setSelectedSlides(selectedSlides.filter((s) => s.slideId !== slideId));
        await fetchSlides();
      } else {
        toast.error("Erro ao deletar imagem");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar imagem");
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Permitir salvar mesmo sem seleção (será deletado do banco)
    // if (selectedSlides.length === 0) {
    //   toast.error("Selecione pelo menos 1 imagem");
    //   return;
    // }

    setLoading(true);
    try {
      const response = await fetch("/api/background/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          selectedSlides: selectedSlides.map((s) => ({
            slideId: s.slideId,
            duration: 5,
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
      {/* PREVIEW DO CAROUSEL - GRANDE E VISÍVEL */}
      {selectedSlides.length > 0 && (
        <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Preview do Carousel</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={carouselRef}
              className="relative w-full bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center"
            >
              {/* Imagem atual */}
              <img
                src={selectedSlides[currentImageIndex]?.urlMedia}
                alt={selectedSlides[currentImageIndex]?.titulo}
                className="w-full h-full object-cover"
              />

              {/* Overlay com informações */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white font-semibold text-sm">
                  {selectedSlides[currentImageIndex]?.titulo}
                </p>
                <p className="text-white/70 text-xs">
                  {currentImageIndex + 1} de {selectedSlides.length}
                </p>
              </div>

              {/* Controles de preview */}
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                  className="rounded-full"
                >
                  {isPlayingPreview ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Indicadores de slide */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {selectedSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex ? "bg-primary" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="w-full gap-2"
        >
          <Upload size={16} />
          {uploading ? "Enviando..." : "Fazer Upload de Imagens"}
        </Button>
      </div>

      {/* Imagens Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Imagens Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {carouselSlides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma imagem. Faça upload acima.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {carouselSlides.map((slide) => {
                const isSelected = selectedSlides.some((s) => s.slideId === slide.id);
                return (
                  <div
                    key={slide.id}
                    className={`relative rounded-lg overflow-hidden border-4 transition ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <img
                      src={slide.urlMedia}
                      alt={slide.titulo}
                      className="w-full h-32 object-cover cursor-pointer"
                      onClick={() => handleToggleSlide(slide)}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold">
                          ✓ Selecionada
                        </div>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imagens Selecionadas - GRANDE */}
      {selectedSlides.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">
              Imagens Selecionadas ({selectedSlides.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedSlides.map((slide, index) => (
                <div
                  key={slide.slideId}
                  className="flex items-center gap-4 p-4 border-2 border-primary rounded-lg bg-background"
                >
                  {/* Número */}
                  <div className="text-2xl font-bold text-primary w-10 h-10 flex items-center justify-center bg-primary/10 rounded">
                    {index + 1}
                  </div>

                  {/* Imagem Grande */}
                  <div className="w-32 h-32 flex-shrink-0 rounded overflow-hidden border-2 border-primary">
                    <img
                      src={slide.urlMedia}
                      alt={slide.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{slide.titulo}</p>
                    <p className="text-sm text-muted-foreground">Duração: 5s</p>
                  </div>

                  {/* Botão Remover */}
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => handleRemoveSlide(slide.slideId)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Salvar */}
      <Button
        onClick={handleSave}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
