import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Play, SkipBack, SkipForward } from 'lucide-react';

interface CurrentChannel {
  id: string;
  name: string;
  logo: string;
  category: string;
  description: string;
  viewers: number;
  isLive: boolean;
}

export default function MaximusPlayer() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<CurrentChannel>({
    id: '1',
    name: 'Globo FHD',
    logo: 'https://via.placeholder.com/100x100',
    category: 'ABERTA',
    description: 'Globo - Programação variada',
    viewers: 1250000,
    isLive: true,
  });

  const [mostWatched, setMostWatched] = useState<CurrentChannel[]>([
    {
      id: '1',
      name: 'Globo FHD',
      logo: 'https://via.placeholder.com/100x100',
      category: 'ABERTA',
      description: 'Globo - Programação variada',
      viewers: 1250000,
      isLive: true,
    },
    {
      id: '2',
      name: 'SBT FHD',
      logo: 'https://via.placeholder.com/100x100',
      category: 'ABERTA',
      description: 'SBT - Entretenimento',
      viewers: 850000,
      isLive: true,
    },
    {
      id: '3',
      name: 'Record FHD',
      logo: 'https://via.placeholder.com/100x100',
      category: 'ABERTA',
      description: 'Record - Jornalismo e séries',
      viewers: 620000,
      isLive: true,
    },
  ]);

  const handleChannelChange = async (channel: CurrentChannel) => {
    setCurrentChannel(channel);
    setIsPanelOpen(false);
    
    // Enviar para backend qual canal esta sendo assistido
    try {
      let mac = localStorage.getItem('deviceMac') || 
                sessionStorage.getItem('mac') || 
                localStorage.getItem('mac') || null;
      
      if (!mac) {
        const params = new URLSearchParams(window.location.search);
        mac = params.get('mac') || params.get('deviceMac') || null;
      }
      
      if (!mac) {
        console.warn('MAC do dispositivo nao encontrado');
        return;
      }
      
      const response = await fetch('/api/v4/heartbeat.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: mac.toUpperCase(),
          content: channel.name,
        }),
      });
      const data = await response.json();
      console.log('Canal atualizado no heartbeat:', data);
    } catch (error) {
      console.error('Erro ao atualizar canal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img src={currentChannel.logo} alt={currentChannel.name} className="w-12 h-12 rounded" />
          <div>
            <h1 className="text-xl font-bold">MAXIMUS PLAYER</h1>
            <p className="text-sm text-gray-400">Assistindo: {currentChannel.name}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="flex items-center gap-2"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`} />
          Canais
        </Button>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 w-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center relative">
        <div className="text-center">
          <img src={currentChannel.logo} alt={currentChannel.name} className="w-32 h-32 mx-auto mb-4 rounded" />
          <h2 className="text-4xl font-bold mb-2">{currentChannel.name}</h2>
          <p className="text-gray-400 mb-4">{currentChannel.description}</p>
          <div className="flex items-center justify-center gap-2">
            {currentChannel.isLive && (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-500 font-bold">AO VIVO</span>
              </>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-4">
            👥 {currentChannel.viewers.toLocaleString('pt-BR')} espectadores
          </p>
        </div>

        {/* Pull-down Panel Indicator */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs animate-bounce">
          ⬇️ Deslize para ver canais
        </div>
      </div>

      {/* Channels Panel */}
      {isPanelOpen && (
        <div className="bg-gray-900 border-t border-gray-800 p-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">Canais Mais Assistidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mostWatched.map((channel) => (
              <Card
                key={channel.id}
                className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-700 transition"
                onClick={() => handleChannelChange(channel)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={channel.logo} alt={channel.name} className="w-12 h-12 rounded" />
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{channel.name}</h4>
                      <p className="text-xs text-gray-400">{channel.category}</p>
                    </div>
                    {channel.isLive && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-red-500">LIVE</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{channel.description}</p>
                  <p className="text-xs text-gray-500">👥 {channel.viewers.toLocaleString('pt-BR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="bg-gradient-to-t from-black to-transparent p-4 flex justify-center gap-4">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <SkipBack className="w-4 h-4" />
          Anterior
        </Button>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Reproduzir
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          Próximo
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
