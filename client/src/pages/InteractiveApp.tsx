import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

export default function InteractiveApp() {
  const { data: config } = trpc.interactive.getConfig.useQuery();
  const { data: banners } = trpc.interactive.getBanners.useQuery();
  const { data: introConfig } = trpc.appIntro.getConfig.useQuery();

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Auto-play carousel
  useEffect(() => {
    if (!banners || banners.length === 0 || !config) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, config.autoplayInterval || 5000);

    return () => clearInterval(interval);
  }, [banners, config]);

  // Handle intro animation
  useEffect(() => {
    if (!introConfig?.habilitado || !showIntro) return;

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, introConfig.duracao || 3000);

    return () => clearTimeout(timer);
  }, [introConfig, showIntro]);

  // Play intro sound
  useEffect(() => {
    if (showIntro && introConfig?.soundUrl && !isMuted) {
      const audio = new Audio(introConfig.soundUrl);
      audio.play().catch(() => console.log("Som não pode ser reproduzido"));
    }
  }, [showIntro, introConfig, isMuted]);

  if (showIntro && introConfig?.habilitado) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
        {/* Fundo com gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

        {/* Partículas de fundo */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 2}s infinite ease-in-out`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Logo com animação */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          {introConfig?.logoUrl && (
            <div className="animate-pulse mb-8">
              <img
                src={introConfig.logoUrl}
                alt="InteractivePro"
                className="w-48 h-48 drop-shadow-2xl"
                style={{
                  animation: "spin 3s linear infinite, pulse 2s ease-in-out infinite",
                }}
              />
            </div>
          )}

          <h1 className="text-4xl font-bold text-purple-400 text-center mt-8 drop-shadow-lg">
            {config?.appName || "InteractivePro"}
          </h1>
          <p className="text-purple-300 text-sm mt-2 animate-pulse">Carregando...</p>
        </div>

        <style>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) translateX(0px);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100px) translateX(50px);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  if (!config || !banners) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const currentBanner = banners[currentBannerIndex];

  return (
    <div
      className="w-full h-screen bg-cover bg-center flex flex-col"
      style={{
        backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {config.appLogo && (
              <img src={config.appLogo} alt="Logo" className="w-10 h-10 rounded" />
            )}
            <h1 className="text-2xl font-bold text-white">{config.appName}</h1>
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Banner Carousel */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative w-full max-w-4xl">
            {/* Banner atual */}
            <div className="rounded-lg overflow-hidden shadow-2xl bg-black">
              {currentBanner.tipo === "image" ? (
                <img
                  src={currentBanner.urlMedia}
                  alt={currentBanner.titulo}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23333' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23999' text-anchor='middle' dy='.3em'%3EImagem não carregou%3C/text%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <video
                  src={currentBanner.urlMedia}
                  autoPlay
                  muted={isMuted}
                  className="w-full h-96 object-cover"
                  onError={() => console.log("Vídeo não carregou")}
                />
              )}
            </div>

            {/* Informações do banner */}
            <div className="mt-4 text-white">
              <h2 className="text-2xl font-bold">{currentBanner.titulo}</h2>
              {currentBanner.descricao && (
                <p className="text-gray-300 mt-2">{currentBanner.descricao}</p>
              )}
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() =>
                  setCurrentBannerIndex(
                    (prev) => (prev - 1 + banners.length) % banners.length
                  )
                }
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>

              {/* Indicadores */}
              <div className="flex gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentBannerIndex
                        ? "bg-purple-500 w-8"
                        : "bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
                }
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer com informações */}
        <div className="p-6 bg-black/50 backdrop-blur-sm text-white text-center text-sm">
          <p>
            Banner {currentBannerIndex + 1} de {banners.length}
          </p>
        </div>
      </div>
    </div>
  );
}
