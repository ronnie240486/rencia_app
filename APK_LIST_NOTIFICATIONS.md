# Notificações de listas para OuroPro, Ultra Player e Maximus

O painel já confirma a falha de uma lista somente após **dois testes técnicos consecutivos**. Lentidão isolada, resposta HTTP 403 e problemas de uma única conta não geram essa notificação. Cada APK deve consultar apenas os avisos do MAC que está em uso.

## Consultar avisos do aparelho

```http
GET https://renciaapp.manus.space/api/v5/list-notifications?mac={MAC_DO_APARELHO}
```

O MAC pode ser enviado com ou sem separadores. A resposta possui o seguinte formato:

```json
{
  "success": true,
  "mac": "AA:BB:CC:DD:EE:FF",
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
| `status: "failure"` | Exibir aviso técnico ao usuário. Não bloquear o app nem trocar lista sem aplicar a própria lógica de failover. |
| `status: "recovered"` | Exibir opcionalmente a mensagem de que a lista foi recuperada ou apenas remover o estado de manutenção local. |
| `acknowledged: false` | O aplicativo pode mostrar a mensagem uma vez e, em seguida, confirmar a leitura. |
| `message` | Usar como texto do aviso. Não montar mensagem com dados de outras contas. |

O aplicativo deve consultar a rota no início e depois junto do heartbeat, a cada **60 segundos**. A falha da consulta não pode interromper a reprodução nem apagar a última lista válida.

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

O APK não deve consultar alertas de outro MAC, usar rotas do OuroPro para o Ultra Player ou considerar um timeout isolado como falha de lista. Deve usar HTTPS, manter a lista atual enquanto não houver troca recebida pelo failover e confirmar somente os IDs que vierem na rota acima.
