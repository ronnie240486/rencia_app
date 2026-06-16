'use client';

import { useEffect, useRef, useState } from "react";
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log("BackgroundImagesSettings montado");
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
        const normalizedSlides = data.slides.map((s: any) => ({
          ...s,
          id: Number(s.id),
        }));
        console.log("Slides carregados:", normalizedSlides);
        setCarouselSlides(normalizedSlides);
      }
    } catch (error) {
      console.error("Erro ao buscar slides:", error);
    }
  };

  const fetchBackgroundConfig = async () => {
    try {
      const response = await fetch(`/api/background/get/${user?.id}`);
      const data = await response.json();
      if (data.ok && data.backgrounds) {
        const ids = data.backgrounds.map((b: any) => Number(b.slideId ?? b.carouselSlideId));
        console.log("Configurações carregadas, IDs selecionados:", ids);
        setSelectedIds(ids);
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    setUploading(true);
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/carousel/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Imagens enviadas com sucesso!");
        fetchSlides();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error("Erro ao fazer upload: " + (data.message || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const toggleSlide = (slideId: number) => {
    console.log("toggleSlide chamado com slideId:", slideId);
    
    setSelectedIds((prev) => {
      const newSelected = prev.includes(slideId)
        ? prev.filter(id => id !== slideId)
        : [...prev, slideId];
      
      console.log("newSelected:", newSelected);
      return newSelected;
    });
  };

  const deleteSlide = async (slideId: number) => {
    if (!confirm("Tem certeza que deseja deletar esta imagem?")) return;

    try {
      const response = await fetch(`/api/carousel/delete/${slideId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Imagem deletada com sucesso!");
        fetchSlides();
        setSelectedIds((prev) => prev.filter(id => id !== slideId));
      } else {
        toast.error("Erro ao deletar imagem");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar imagem");
    }
  };

  const handleSave = async () => {
    if (selectedIds.length < 2) {
      toast.error("Selecione pelo menos 2 imagens");
      return;
    }

    setLoading(true);
    try {
      const selectedSlides = carouselSlides
        .filter((slide) => selectedIds.includes(Number(slide.id)))
        .map((slide) => ({
          slideId: Number(slide.id),
          urlMedia: slide.urlMedia,
          titulo: slide.titulo,
        }));

      const response = await fetch("/api/background/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          selectedSlides,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  console.log("Renderizando BackgroundImagesSettings");
  console.log("carouselSlides:", carouselSlides);
  console.log("selectedIds:", selectedIds);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carousel de Fundo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione multiplas imagens para criar um carousel automatico na tela inicial do APK.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Button */}
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
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed border-2 py-6"
          >
            <Upload className="mr-2 h-5 w-5" />
            {uploading ? "Enviando..." : "Fazer Upload de Imagens"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Clique para selecionar imagens
          </p>
        </div>

        {/* Imagens Disponíveis */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Imagens Disponíveis</p>
          {carouselSlides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma imagem. Faça upload acima.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {carouselSlides.map((slide) => {
                const slideId = Number(slide.id);
                const isSelected = selectedIds.includes(slideId);
                return (
                  <div key={slide.id} className="space-y-2">
                    {/* Imagem com Button Overlay */}
                    <div
                      className={`relative rounded-lg overflow-hidden border-4 transition ${
                        isSelected ? "border-primary" : "border-border"
                      }`}
                    >
                      <img
                        src={slide.urlMedia}
                        alt={slide.titulo}
                        className="w-full h-40 object-cover"
                      />
                      <Button
                        onClick={() => toggleSlide(slideId)}
                        variant="ghost"
                        size="sm"
                        className="absolute inset-0 w-full h-full rounded-none opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {isSelected ? "✓ Selecionada" : "Selecionar"}
                      </Button>
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                          <span className="text-white text-2xl font-bold">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Botão Delete */}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteSlide(slideId)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumo */}
        {selectedIds.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              {selectedIds.length} imagem(ns) selecionada(s)
            </p>
          </div>
        )}

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={selectedIds.length < 2 || loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
