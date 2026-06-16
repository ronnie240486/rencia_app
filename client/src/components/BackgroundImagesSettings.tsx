import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface SelectedSlide {
  slideId: number;
  urlMedia: string;
  titulo: string;
}

export default function BackgroundImagesSettings() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [carouselSlides, setCarouselSlides] = useState<any[]>([]);
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSlides();
    if (user?.id) {
      fetchBackgroundConfig();
    }
  }, [user?.id]);

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
      // Recarregar slides
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

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (selectedSlides.length === 0) {
      toast.error("Selecione pelo menos 1 imagem");
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
                    onClick={() => handleToggleSlide(slide)}
                    className={`relative rounded-lg overflow-hidden border-4 cursor-pointer transition ${
                      isSelected ? "border-primary" : "border-border"
                    }`}
                  >
                    <img
                      src={slide.urlMedia}
                      alt={slide.titulo}
                      className="w-full h-32 object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold">
                          ✓ Selecionada
                        </div>
                      </div>
                    )}
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
        disabled={loading || selectedSlides.length === 0}
        size="lg"
        className="w-full"
      >
        {loading ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
