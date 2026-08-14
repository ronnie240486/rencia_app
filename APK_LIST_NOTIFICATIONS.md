# Notificações de listas, failover e vencimento para OuroPro, Ultra Player e Maximus

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
  "playlist_sync_required": true,
  "playlist_sync_mode": "background",
  "playlist_sync_message": "A Lista 1 apresentou problema e você foi mudado automaticamente para Lista 2 · Backup. Assim que normalizar, sua lista principal voltará automaticamente.",
  "reload_required": false,
  "reload_message": null,
  "failover_transition_id": 91,
  "changed_at": "2026-08-14T12:00:00.000Z",
  "expiration": {
    "expiration_date": "2026-08-15",
    "expiration_display": "15/08/2026",
    "days_remaining": 1,
    "expiration_state": "expires_tomorrow",
    "show_modal": true,
    "modal_key": "expiration:2026-08-15:expires_tomorrow",
    "modal_title": "Seu acesso vence amanhã",
    "modal_message": "Seu acesso vence amanhã (15/08/2026). Renove para evitar interrupção."
  },
  "notifications": [
    {
      "id": 123,
      "status": "failure",
      "severity": "critical",
      "title": "Aviso sobre sua lista",
      "message": "Detectamos uma instabilidade temporária na sua lista. Você não precisa fazer nada; se necessário, uma lista de reserva será ativada automaticamente.",
      "created_at": "2026-08-14T12:00:00.000Z",
      "acknowledged": false
    }
  ]
}
```

| Campo | Regra no APK |
|---|---|
| `failover_active: true` | Uma lista de reserva já foi escolhida pelo painel. O APK deve atualizar a playlist ativa sem fechar o aplicativo e exibir `playlist_sync_message`. |
| `failover_state: "backup_active"` | Lista 2 ou Lista 3 está ativa. O APK deve buscar imediatamente sua configuração normal de playlists, aplicar a lista priorizada e continuar a reprodução. |
| `failover_state: "primary_restored"` | A Lista 1 foi restaurada pelo painel. O APK deve buscar a configuração normal de playlists, reaplicar a Lista 1 e mostrar a mensagem informativa. |
| `playlist_sync_required: true` | O APK deve executar a atualização automática da playlist em memória, sem sair e sem exigir ação do cliente. |
| `playlist_sync_mode: "background"` | Fazer a troca sem abrir outra tela ou encerrar o app. Pode manter o último conteúdo visível enquanto recarrega. |
| `playlist_sync_message` | Exibir em banner, toast ou diálogo não bloqueante depois de concluir a atualização automática. |
| `failover_transition_id` | Salvar este número no armazenamento local. Só executar a troca e mostrar a mensagem se o número for diferente do último já processado. |
| `reload_required` | Mantido por compatibilidade e permanece `false`; o APK não deve pedir para fechar ou reiniciar. |
| `status: "failure"` | Exibir o aviso simples ao cliente. Caso `failover_active` seja `true`, usar preferencialmente `playlist_sync_message`. Nunca exibir textos internos do painel. |
| `status: "recovered"` | Exibir opcionalmente a recuperação. Quando `failover_state` for `primary_restored`, usar `playlist_sync_message`. |
| `acknowledged: false` | O aplicativo pode mostrar a mensagem uma vez e, em seguida, confirmar a leitura. |
| `message` | Usar como texto técnico complementar. Não montar mensagem com dados de outras contas. |

## Modal de vencimento

O objeto `expiration` sempre traz a data que está cadastrada para aquele MAC. O APK deve consultar essa mesma rota ao iniciar e depois junto do heartbeat. Assim, se a data for alterada no painel, o aviso se ajusta automaticamente no aplicativo.

| Campo | Regra no APK |
|---|---|
| `expiration_date` | Data de vencimento no formato `AAAA-MM-DD`. Pode ser `null` se o cliente ainda não tiver data cadastrada. |
| `expiration_display` | Data pronta para exibir ao cliente, no formato `DD/MM/AAAA`. |
| `days_remaining` | Dias até o vencimento. Valor negativo significa acesso vencido. |
| `expiration_state` | Pode ser `upcoming`, `expires_tomorrow`, `expires_today`, `expired` ou `none`. |
| `show_modal: true` | Exibir o modal somente para amanhã, hoje ou vencido. |
| `modal_key` | Guardar localmente. Mostrar o modal uma vez por chave, evitando repetição a cada minuto. |
| `modal_title` e `modal_message` | Usar diretamente na tela do cliente. Não acrescentar palavras sobre painel, modal interno ou monitoramento. |

O aplicativo deve consultar a rota no início e depois junto do heartbeat, a cada **60 segundos**. A falha da consulta não pode interromper a reprodução nem apagar a última lista válida. A atualização automática deve usar `failover_transition_id` para não reaparecer a cada minuto.

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

O APK não deve consultar alertas de outro MAC, usar rotas do OuroPro para o Ultra Player ou considerar um timeout isolado como falha de lista. Deve usar HTTPS e não deve decidir a troca por conta própria: o painel é a fonte de verdade para a lista ativa. Quando houver uma nova `failover_transition_id` com `playlist_sync_required: true`, o APK deve consultar novamente sua rota normal de configuração de playlists, substituir a lista carregada em memória pela lista priorizada e continuar sem encerrar o aplicativo. Depois, deve mostrar `playlist_sync_message` como aviso não bloqueante. **O cliente nunca deve receber textos como “abra o Monitor de Listas”, “abra o modal”, “painel” ou qualquer outra instrução operacional.** A confirmação deve ser enviada somente para IDs de alertas recebidos na rota acima.
