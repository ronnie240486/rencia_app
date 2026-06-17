"use client";

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
        // Normalizar IDs para number
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
        // Normalizar IDs para number (pode vir como slideId ou carouselSlideId)
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

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const response = await fetch("/api/carousel/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Imagens enviadas com sucesso!");
        await fetchSlides();
      } else {
        toast.error("Erro ao enviar imagens");
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

  const toggleSlide = (slideId: any) => {
    // Normalizar para number
    const normalizedId = Number(slideId);
    console.log("toggleSlide chamado com slideId:", normalizedId, "(tipo:", typeof normalizedId, ")");
    console.log("selectedIds antes:", selectedIds);
    
    const newSelected = selectedIds.includes(normalizedId)
      ? selectedIds.filter(id => id !== normalizedId)
      : [...selectedIds, normalizedId];
    
    console.log("selectedIds depois:", newSelected);
    setSelectedIds(newSelected);
  };

  const deleteSlide = async (slideId: number) => {
    if (!confirm("Tem certeza que deseja deletar esta imagem?")) return;

    try {
      const response = await fetch(`/api/carousel/delete/${slideId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Imagem deletada!");
        await fetchSlides();
      } else {
        toast.error("Erro ao deletar imagem");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar");
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (selectedIds.length < 2) {
      toast.error("Selecione pelo menos 2 imagens");
      return;
    }

    setLoading(true);
    try {
      const selectedSlides = carouselSlides
        .filter((s) => selectedIds.includes(Number(s.id)))
        .map((s) => ({
          slideId: Number(s.id),
          duration: 5,
        }));

      const response = await fetch(`/api/background/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, selectedSlides }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error(data.message || "Erro ao salvar");
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
        {/* Upload */}
        <div className="space-y-2 p-4 bg-primary/10 rounded-lg border-2 border-dashed border-primary">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6"
            size="lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            {uploading ? "Enviando..." : "Fazer Upload de Imagens"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">Clique para selecionar imagens</p>
        </div>

        {/* Imagens */}
        <div className="space-y-4">
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
                    {/* Imagem Clicável */}
                    <div
                      onClick={() => toggleSlide(slideId)}
                      className={`relative rounded-lg overflow-hidden border-4 transition cursor-pointer ${
                        isSelected ? "border-primary" : "border-border"
                      }`}
                    >
                      <img
                        src={slide.urlMedia}
                        alt={slide.titulo}
                        className="w-full h-40 object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <span className="text-white text-2xl">✓</span>
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

        {/* Resumo das selecionadas */}
        {selectedIds.length > 0 && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              {selectedIds.length} imagem(ns) selecionada(s)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {carouselSlides
                .filter((s) => selectedIds.includes(Number(s.id)))
                .map((s) => (
                  <img
                    key={s.id}
                    src={s.urlMedia}
                    alt={s.titulo}
                    className="w-full h-20 object-cover rounded"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={loading || selectedIds.length < 2}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
