import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'xtream' | 'm3u';
  username?: string;
  password?: string;
  server?: string;
}

export default function Player() {
  const [mac, setMac] = useState('');
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchPlaylists = async () => {
    if (!mac.trim()) {
      setError('Por favor, insira o MAC do device');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/guim.php?mac=${encodeURIComponent(mac)}`);
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        const items: PlaylistItem[] = data.data.map((item: any, index: number) => ({
          id: `${index}`,
          name: item.name || `Playlist ${index + 1}`,
          url: item.url || '',
          type: item.type || 'xtream',
          username: item.username,
          password: item.password,
          server: item.server,
        }));
        setPlaylists(items);
      } else {
        setError('Nenhuma playlist encontrada para este device');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playPlaylist = (playlist: PlaylistItem) => {
    setSelectedPlaylist(playlist);
    setIsPlaying(true);
    
    if (videoRef.current) {
      if (playlist.type === 'xtream' && playlist.server && playlist.username && playlist.password) {
        // Para Xtream, construir URL com credenciais
        const xtreamUrl = `${playlist.server}/player_api.php?username=${playlist.username}&password=${playlist.password}&action=get_live_streams`;
        videoRef.current.src = xtreamUrl;
      } else {
        videoRef.current.src = playlist.url;
      }
      videoRef.current.play();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value / 100;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Rencia Player</h1>
          <p className="text-slate-400">Player IPTV Web</p>
        </div>

        {/* MAC Input */}
        <Card className="bg-slate-800 border-slate-700 p-6 mb-8">
          <div className="flex gap-4">
            <Input
              placeholder="Insira o MAC do device (ex: 70:2E:8E:96:0A:3C)"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchPlaylists()}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            <Button
              onClick={fetchPlaylists}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {loading ? 'Carregando...' : 'Buscar'}
            </Button>
          </div>
          {error && <p className="text-red-400 mt-3">{error}</p>}
        </Card>

        {/* Player */}
        {selectedPlaylist && (
          <Card className="bg-slate-800 border-slate-700 p-6 mb-8">
            <div className="space-y-4">
              {/* Video */}
              <div className="bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full aspect-video bg-black"
                  controls
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={togglePlayPause}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </Button>

                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="outline"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </Button>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-24"
                  />

                  <span className="text-white text-sm">{selectedPlaylist.name}</span>
                </div>

                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="outline"
                >
                  <Maximize size={20} />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Playlists */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Playlists ({playlists.length})</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('grid')}
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
              >
                <Grid3x3 size={20} />
              </Button>
              <Button
                onClick={() => setViewMode('list')}
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
              >
                <List size={20} />
              </Button>
            </div>
          </div>

          {playlists.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 p-8 text-center">
              <p className="text-slate-400">Nenhuma playlist encontrada. Insira um MAC válido.</p>
            </Card>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
              {playlists.map((playlist) => (
                <Card
                  key={playlist.id}
                  className={`bg-slate-800 border-slate-700 p-4 cursor-pointer hover:bg-slate-700 transition ${
                    selectedPlaylist?.id === playlist.id ? 'border-blue-500 bg-slate-700' : ''
                  }`}
                  onClick={() => playPlaylist(playlist)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{playlist.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {playlist.type === 'xtream' ? 'Xtream Codes' : 'M3U Playlist'}
                      </p>
                    </div>
                    <Play size={20} className="text-blue-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
