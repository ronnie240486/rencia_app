import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Hook que renova a presença e mantém o conteúdo atual no painel enquanto
 * a tela de reprodução estiver aberta, mesmo sem troca de canal ou episódio.
 */
export function useHeartbeat(mac: string | undefined, currentChannel: string | undefined) {
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChannelRef = useRef(currentChannel);

  useEffect(() => {
    currentChannelRef.current = currentChannel;
  }, [currentChannel]);

  useEffect(() => {
    if (!mac) return;

    const sendHeartbeat = async () => {
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://renciaapp.manus.space';
        const url = `${backendUrl}/api/v4/heartbeat.php`;

        const payload = {
          mac,
          content: currentChannelRef.current || undefined,
          app_id: 'maximus',
          device_type: Platform.OS === 'web' ? 'web' : Platform.OS, // 'android', 'ios', 'web'
          timestamp: new Date().toISOString(),
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.warn(`[Heartbeat] Erro ao enviar: ${response.status}`);
        } else {
          console.log('[Heartbeat] Enviado com sucesso:', payload);
        }
      } catch (error) {
        console.warn('[Heartbeat] Erro de conexão:', error);
      }
    };

    // Enviar heartbeat imediatamente
    sendHeartbeat();

    // Renova a sessão a cada minuto com o mesmo título, caso o usuário
    // permaneça assistindo ao mesmo episódio por bastante tempo.
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 60_000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [mac]);
}
