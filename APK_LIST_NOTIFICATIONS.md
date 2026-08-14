# Notificações e failover automático de listas para OuroPro, Ultra Player e Maximus

O painel confirma falha de uma lista somente após **dois testes técnicos consecutivos**. Lentidão isolada, resposta HTTP 403 e problemas de uma única conta não geram essa notificação. Quando houver uma Lista 2 ou Lista 3 válida, o painel já a ativa automaticamente. Quando a Lista 1 voltar a responder, o painel a restaura automaticamente. Cada APK deve consultar apenas os avisos do MAC que está em uso.

## Consultar avisos do aparelho

```http
GET https://renciaapp.manus.space/api/v5/list-notifications?mac={MAC_DO_APARELHO}
```

O MAC pode ser enviado com ou sem separadores. A resposta possui o seguinte formato:

```json
{
  "success": true,
  "mac": "AA:BB:CC:DD:EE:FF",
  "failover_active": true,
  "failover_state": "backup_active",
  "active_list_name": "Lista 2 · Backup",
  "active_list_number": 2,
  "reload_required": true,
  "reload_message": "Lista 2 · Backup foi ativada automaticamente porque a lista anterior apresentou falha técnica confirmada. Feche e abra o aplicativo para carregar a lista de reserva.",
  "failover_transition_id": 91,
  "changed_at": "2026-08-14T12:00:00.000Z",
  "notifications": [
    {
      "id": 123,
      "status": "failure",
      "severity": "critical",
      "title": "Falha confirmada de lista: Lista 1 · Cliente #42",
      "message": "Falha técnica confirmada em dois testes consecutivos...",
      "created_at": "2026-08-14T12:00:00.000Z",
      "acknowledged": false
    }
  ]
}
```

| Campo | Regra no APK |
|---|---|
| `failover_active: true` | Uma lista de reserva já foi escolhida pelo painel. O APK deve exibir `reload_message` e solicitar que o cliente feche e abra o app. |
| `failover_state: "backup_active"` | Lista 2 ou Lista 3 está ativa. Ao abrir novamente, o APK deve buscar a configuração principal de listas do painel e iniciar pela lista ativa. |
| `failover_state: "primary_restored"` | A Lista 1 foi restaurada pelo painel. O APK deve exibir `reload_message`; ao abrir novamente, volta para a Lista 1. |
| `reload_required: true` | Exibir o aviso uma vez para a transição recebida. Não tentar trocar URL localmente antes de o app reiniciar. |
| `failover_transition_id` | Salvar este número no armazenamento local. Só mostrar `reload_message` se o número for diferente do último já apresentado. |
| `status: "failure"` | Exibir o aviso técnico. Caso `failover_active` seja `true`, usar preferencialmente `reload_message`, que confirma a lista de reserva ativa. |
| `status: "recovered"` | Exibir opcionalmente a recuperação. Quando `failover_state` for `primary_restored`, usar `reload_message`. |
| `acknowledged: false` | O aplicativo pode mostrar a mensagem uma vez e, em seguida, confirmar a leitura. |
| `message` | Usar como texto técnico complementar. Não montar mensagem com dados de outras contas. |

O aplicativo deve consultar a rota no início e depois junto do heartbeat, a cada **60 segundos**. A falha da consulta não pode interromper a reprodução nem apagar a última lista válida. O diálogo de reinício deve usar `failover_transition_id` para não reaparecer a cada minuto.

## Confirmar a exibição do aviso

Depois de apresentar o aviso ao usuário, o APK deve chamar:

```http
POST https://renciaapp.manus.space/api/v5/list-notifications/ack
Content-Type: application/json

{
  "mac": "AA:BB:CC:DD:EE:FF",
  "alert_id": 123
}
```

Essa confirmação é **por aparelho** e não altera a Central de Alertas do painel. Assim, a revenda continua vendo o histórico da falha, enquanto o APK evita repetir a mesma mensagem a cada abertura.

## Regras obrigatórias

O APK não deve consultar alertas de outro MAC, usar rotas do OuroPro para o Ultra Player ou considerar um timeout isolado como falha de lista. Deve usar HTTPS e não deve decidir a troca por conta própria: o painel é a fonte de verdade para a lista ativa. Quando houver uma nova `failover_transition_id` com `reload_required: true`, o APK só mostra o aviso; após o cliente fechar e abrir, ele consulta novamente a configuração do dispositivo e carrega a lista já priorizada pelo painel. A confirmação deve ser enviada somente para IDs de alertas recebidos na rota acima.
