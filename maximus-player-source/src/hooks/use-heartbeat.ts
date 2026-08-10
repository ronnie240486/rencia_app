import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Hook que envia heartbeat periódico com o canal atual sendo assistido.
 * Envia para o backend a cada 30 segundos.
 */
export function useHeartbeat(mac: string | undefined, currentChannel: string | undefined) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!mac) return;

    const sendHeartbeat = async () => {
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://renciaapp.manus.space';
        const url = `${backendUrl}/api/v4/heartbeat.php`;

        const payload = {
          mac,
          current_content: currentChannel || 'Sem canal',
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

    // Configurar intervalo de 30 segundos
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [mac, currentChannel]);
}
