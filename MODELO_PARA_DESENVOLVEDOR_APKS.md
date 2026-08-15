# Mensagem pronta para o desenvolvedor do OuroPro, Ultra Player ou Maximus

> Olá. Preciso implementar no aplicativo a integração com o painel Rencia App para que o cliente receba avisos de vencimento e de falha de lista na própria tela, e para que a troca de Lista 1 para Lista 2 ou Lista 3 ocorra automaticamente, sem fechar ou reiniciar o aplicativo.

O painel já está pronto. A integração do APK deve usar o MAC do aparelho e a base:

```text
https://renciaapp.manus.space
```

## 1. Consulta periódica obrigatória

Ao abrir o aplicativo e depois a cada **60 segundos** enquanto ele estiver aberto, fazer a consulta abaixo usando o MAC do aparelho atual:

```http
GET https://renciaapp.manus.space/api/v5/list-notifications?mac={MAC}
```

O MAC pode ser enviado com ou sem `:`. A resposta será JSON e terá os objetos `expiration`, `notifications` e os campos de failover.

## 2. Aviso de vencimento na tela do cliente

Ler o objeto `expiration`. Quando `show_modal` for `true`, exibir um modal simples ao cliente usando diretamente:

```text
expiration.modal_title
expiration.modal_message
```

Exemplo de resposta:

```json
"expiration": {
  "expiration_date": "2026-08-16",
  "expiration_display": "16/08/2026",
  "days_remaining": 1,
  "expiration_state": "expires_tomorrow",
  "show_modal": true,
  "modal_key": "expiration:2026-08-16:expires_tomorrow",
  "modal_title": "Seu acesso vence amanhã",
  "modal_message": "Seu acesso vence amanhã (16/08/2026). Renove para evitar interrupção."
}
```

Salvar `modal_key` no armazenamento local do aplicativo. O mesmo modal não deve ser repetido a cada minuto, mas deve aparecer novamente se a chave mudar, por exemplo de `expires_tomorrow` para `expires_today`.

## 3. Aviso de problema na lista

Quando vier um item novo em `notifications` com `status: "failure"`, mostrar uma mensagem simples ao cliente. Nunca mostrar frases internas como “abra o modal”, “abra o Monitor de Listas”, “backend” ou “painel”.

O texto pode ser apresentado em um banner, toast ou diálogo não bloqueante. Depois de mostrar o alerta, confirmar a leitura somente daquele alerta:

```http
POST https://renciaapp.manus.space/api/v5/list-notifications/ack
Content-Type: application/json

{
  "mac": "AA:BB:CC:DD:EE:FF",
  "alert_id": 123
}
```

## 4. Troca automática de Lista 1 para Lista 2 ou Lista 3

O painel é a fonte de verdade da lista ativa. Quando a resposta vier com:

```json
"playlist_sync_required": true,
"playlist_sync_mode": "background",
"failover_transition_id": 91
```

o aplicativo deve fazer o seguinte, sem fechar o app:

1. Comparar `failover_transition_id` com o último valor processado no armazenamento local.
2. Se for um valor novo, buscar novamente a configuração/playlist normal já usada pelo próprio aplicativo.
3. Recarregar a playlist ativa **em memória**, respeitando a prioridade devolvida pelo painel.
4. Continuar a reprodução ou voltar para a tela de canais sem exigir ação do cliente.
5. Mostrar `playlist_sync_message` em um aviso simples.
6. Salvar o novo `failover_transition_id` para não repetir a troca.

Exemplo de aviso esperado:

```text
A Lista 1 apresentou problema. A Lista 2 foi ativada automaticamente. Assim que normalizar, sua lista principal voltará.
```

Quando `failover_state` for `primary_restored`, repetir a atualização em segundo plano para voltar automaticamente à Lista 1 e mostrar a mensagem recebida.

> Não pedir para o cliente fechar, abrir, reiniciar ou configurar o aplicativo. A troca deve ser silenciosa e automática.

## 5. Troca imediata quando o player parar durante a reprodução

Quando o player nativo retornar um erro real de reprodução — stream parado, falha de rede do stream ou evento de erro do player — enviar imediatamente:

```http
POST https://renciaapp.manus.space/api/v5/playback-failure
Content-Type: application/json

{
  "mac": "AA:BB:CC:DD:EE:FF",
  "active_list_number": 1
}
```

Se a resposta tiver `switch_applied: true`, usar a nova lista ativa retornada pelo painel, buscar novamente a configuração normal do aplicativo e recarregar a playlist sem fechar o app. Só chamar essa rota após um erro real do player e bloquear chamadas duplicadas enquanto a troca estiver em andamento.

## 6. Regras de segurança e aceitação

| Regra | Obrigatório |
|---|---|
| Consultar avisos somente do MAC em uso | Sim |
| Consultar no início e a cada 60 segundos | Sim |
| Trocar lista somente quando o painel mandar | Sim |
| Atualizar playlist sem fechar o aplicativo | Sim |
| Exibir vencimento usando `modal_title` e `modal_message` | Sim |
| Evitar repetir o mesmo aviso usando `modal_key` e `failover_transition_id` | Sim |
| Enviar confirmação apenas para `alert_id` recebido | Sim |
| Exibir termos internos do painel para o cliente | Não |
| Decidir sozinho que uma lista está ruim apenas por um timeout isolado | Não |

Por favor, devolver uma versão de teste do APK com essa integração para validação em TV Box e celular.

---

## Contrato técnico completo

O contrato completo, com todos os campos do JSON e regras adicionais, está em `APK_LIST_NOTIFICATIONS.md` no projeto Rencia App.
