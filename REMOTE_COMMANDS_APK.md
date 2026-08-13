# Central de Comandos Remotos — Integração do APK

O painel cria comandos para aparelhos cadastrados. O aplicativo deve consultar os comandos junto do seu ciclo normal de heartbeat e confirmar o resultado depois de tentar executá-los.

## 1. Consulta pelo heartbeat

O endpoint atual de heartbeat agora pode retornar um comando em `command`:

```text
GET https://renciaapp.manus.space/api/v5/heartbeat?mac={MAC}&current_content={CONTEUDO_ATUAL}
```

Também é possível usar a consulta dedicada:

```text
GET https://renciaapp.manus.space/api/v5/remote-commands?mac={MAC}
```

Quando não houver ordem, a resposta contém `command: null`. Quando existir uma ordem pendente, o retorno possui este formato:

```json
{
  "success": true,
  "command": {
    "id": 123,
    "type": "switch_playlist",
    "label": "Trocar lista",
    "payload": { "listIndex": 2 },
    "status": "delivered",
    "expires_at": "2026-08-13T15:00:00.000Z"
  }
}
```

| `type` | Ação esperada no APK | `payload` |
|---|---|---|
| `refresh_playlist` | Recarregar a playlist atual. | `{}` |
| `switch_playlist` | Aplicar a Lista 1, 2 ou 3 e recarregar. | `{ "listIndex": 1 }` |
| `update_dns` | Aplicar a DNS recebida antes de reconectar. | `{ "dns": "https://dns.exemplo.com" }` |
| `show_message` | Exibir aviso em tela para o cliente. | `{ "message": "..." }` |
| `restart_player` | Retornar para a tela inicial e recarregar configurações. | `{}` |
| `sync_access` | Consultar novamente o status do MAC e aplicar bloqueio/liberação. | `{}` |

## 2. Confirmação obrigatória

Depois de executar a ordem, o APK deve confirmar o resultado:

```text
POST https://renciaapp.manus.space/api/v5/remote-commands/ack
Content-Type: application/json
```

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "command_id": 123,
  "status": "executed",
  "result_message": "Playlist atualizada com sucesso"
}
```

Use `status: "failed"` se o aparelho não conseguiu executar a ação e envie a causa resumida em `result_message`.

> O APK deve processar **um comando por vez**, confirmar o resultado e só então buscar o próximo. Ordens vencidas são expiradas pelo painel e não devem ser executadas.
