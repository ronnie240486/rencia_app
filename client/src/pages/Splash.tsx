import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Splash() {
  const [, navigate] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Reproduzir som
    const audio = new Audio("https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/interactive-pro-intro-sound.mp3");
    audio.play().catch(() => console.log("Som não pode ser reproduzido"));
    setIsPlaying(true);

    // Redirecionar após 4 segundos
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Fundo com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

      {/* Partículas de fundo */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-60"
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
        <div className="animate-pulse mb-8">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663162366914/LDyffp73FNnPjitdoAxnFa/interactive-pro-logo-GDoVwxxYZmG354tr9QdfvE.webp"
            alt="InteractivePro"
            className="w-48 h-48 drop-shadow-2xl"
            style={{
              animation: "spin 3s linear infinite, pulse 2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Texto com efeito */}
        <h1 className="text-4xl font-bold text-yellow-400 text-center mt-8 drop-shadow-lg">
          InteractivePro
        </h1>
        <p className="text-yellow-300 text-sm mt-2 animate-pulse">
          Carregando...
        </p>
      </div>

      {/* Estilos de animação */}
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
