import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Heart, CheckCircle, Film, ChevronLeft, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MovieDetails {
  id: string;
  title: string;
  genre: string;
  year: number;
  description: string;
  rating: number;
  poster: string;
  duration: string;
  currentTime: string;
  isFavorite: boolean;
  isWatched: boolean;
  cast: Array<{
    id: string;
    name: string;
    image: string;
  }>;
}

export default function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de dados
    const mockMovie: MovieDetails = {
      id: '1',
      title: 'Silo',
      genre: 'Sci-Fi & Fantasy & Drama',
      year: 2023,
      description:
        'Em um futuro destruído e tóxico, existe uma comunidade que vive dentro de um gigantesco silo subterrâneo com centenas de andares de profundidade. Lá, homens e mulheres vivem numa sociedade cheia de regras que acreditam existir para protegê-los.',
      rating: 8,
      poster: 'https://via.placeholder.com/400x600',
      duration: '00:16:44',
      currentTime: '00:00:00',
      isFavorite: false,
      isWatched: false,
      cast: [
        { id: '1', name: 'Rebecca', image: 'https://via.placeholder.com/100x100' },
        { id: '2', name: 'Gemma', image: 'https://via.placeholder.com/100x100' },
        { id: '3', name: 'Chinaza', image: 'https://via.placeholder.com/100x100' },
        { id: '4', name: 'Ashley', image: 'https://via.placeholder.com/100x100' },
      ],
    };

    setMovie(mockMovie);
    setIsFavorite(mockMovie.isFavorite);
    setIsWatched(mockMovie.isWatched);
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!movie) {
    return <div className="flex items-center justify-center h-screen">Filme não encontrado</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-6 h-6 cursor-pointer" />
          <span className="text-xl font-bold">maxplayer</span>
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Poster com Player */}
      <div className="relative w-full h-96 bg-gradient-to-b from-black/0 to-black">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
            <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent ml-1" />
          </div>
        </div>

        {/* Rating Badge */}
        <div className="absolute bottom-4 right-4 bg-yellow-500 text-black font-bold px-3 py-1 rounded">
          {movie.rating}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
          <div className="h-full bg-yellow-500 w-1/4" />
        </div>

        {/* Time Display */}
        <div className="absolute bottom-4 left-4 text-sm text-white">
          {movie.currentTime} / {movie.duration}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
          <p className="text-gray-400 text-sm">
            {movie.genre} | {movie.year}
          </p>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">{movie.description}</p>

        {/* Action Buttons */}
        <div className="flex gap-8 justify-center py-4">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex flex-col items-center gap-2 text-gray-400 hover:text-red-500 transition"
          >
            <Heart
              className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
            />
            <span className="text-xs">Favorito</span>
          </button>

          <button
            onClick={() => setIsWatched(!isWatched)}
            className="flex flex-col items-center gap-2 text-gray-400 hover:text-yellow-500 transition"
          >
            <CheckCircle
              className={`w-6 h-6 ${isWatched ? 'text-yellow-500' : ''}`}
            />
            <span className="text-xs">Assistido</span>
          </button>

          <button className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition">
            <Film className="w-6 h-6" />
            <span className="text-xs">Trailer</span>
          </button>
        </div>

        {/* Cast Section */}
        <div>
          <h2 className="text-xl font-bold mb-4">Elenco</h2>
          <div className="grid grid-cols-4 gap-3">
            {movie.cast.map((actor) => (
              <div key={actor.id} className="flex flex-col items-center gap-2">
                <img
                  src={actor.image}
                  alt={actor.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <p className="text-xs text-center text-gray-300 truncate w-full">
                  {actor.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex items-center justify-around py-3">
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <div className="w-6 h-6">🏠</div>
          <span className="text-xs">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <div className="w-6 h-6">📺</div>
          <span className="text-xs">Canais de TV</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white">
          <div className="w-6 h-6">🎬</div>
          <span className="text-xs">Filmes</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-yellow-500">
          <div className="w-6 h-6">📹</div>
          <span className="text-xs">Séries de TV</span>
        </button>
      </div>
    </div>
  );
}
