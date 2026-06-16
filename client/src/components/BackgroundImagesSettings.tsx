import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
          // Recarregar slides
          const listResponse = await fetch("/api/carousel/list");
          const listData = await listResponse.json();
          if (listData.ok) {
            setCarouselSlides(listData.slides);
          }
          toast.success(`${file.name} enviado com sucesso!`);
        } else {
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
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
          selectedSlides: selectedSlides.map((s, index) => ({
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
          <CardTitle>Imagens Disponíveis do Carousel</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Clique para selecionar as imagens que deseja usar
          </p>
        </CardHeader>
        <CardContent>
          {carouselSlides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma imagem disponível. Faça upload acima.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {carouselSlides.map((slide) => (
                <div
                  key={slide.id}
                  className="relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition cursor-pointer"
                  onClick={() => handleToggleSlide(slide)}
                >
                  <img
                    src={slide.urlMedia}
                    alt={slide.titulo}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedSlides.some((s) => s.slideId === slide.id)}
                      onCheckedChange={() => handleToggleSlide(slide)}
                    />
                  </div>
                  {selectedSlides.some((s) => s.slideId === slide.id) && (
                    <div className="absolute inset-0 bg-primary/20 border-2 border-primary rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imagens Selecionadas - VISÍVEL */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="text-primary">
            Imagens Selecionadas ({selectedSlides.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSlides.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma imagem selecionada
            </p>
          ) : (
            <div className="space-y-3">
              {selectedSlides.map((slide, index) => (
                <div
                  key={slide.slideId}
                  className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-background"
                >
                  <div className="text-sm font-semibold text-primary w-6 h-6 flex items-center justify-center bg-primary/10 rounded">
                    {index + 1}
                  </div>

                  <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden border-2 border-primary">
                    <img
                      src={slide.urlMedia}
                      alt={slide.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{slide.titulo}</p>
                    <p className="text-xs text-muted-foreground">Duração: 5s</p>
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
          <li>Clique em "Fazer Upload" para adicionar novas imagens</li>
          <li>Clique nas imagens para selecionar (até 5)</li>
          <li>As selecionadas aparecem abaixo em destaque</li>
          <li>Clique "Salvar" para aplicar as mudanças</li>
        </ul>
      </div>
    </div>
  );
}
