# Integração de controle de conexões dos APKs

Cada APK deve criar um identificador aleatório de sessão ao abrir o aplicativo. Esse identificador deve permanecer o mesmo enquanto o app estiver aberto e deve ser enviado a cada heartbeat. O painel aceita letras, números, ponto, hífen, sublinhado e dois-pontos, com 8 a 128 caracteres. Um UUID é recomendado.

## Rota recomendada

Use o heartbeat já existente, acrescentando `app` e `session_id`:

```text
GET /api/v5/heartbeat?mac=MAC_DO_DISPOSITIVO&app=ID_DO_APP&session_id=UUID_DA_SESSAO&current_content=CONTEUDO_ATUAL
```

O APK deve chamar a rota ao abrir, sempre que o conteúdo mudar e a cada 60 segundos enquanto estiver em uso. A sessão expira automaticamente após 150 segundos sem um novo heartbeat. Quando o mesmo MAC estiver cadastrado em mais de um aplicativo, `app` é obrigatório para que o painel controle o cadastro correto.

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `mac` | Sim | MAC do dispositivo. |
| `app` ou `app_id` | Sim quando o MAC existir em mais de um aplicativo | Identificador técnico do app, como `ouropro`, `maximus`, `ominus`, `magnus` ou `excellence`. |
| `session_id` | Sim para ativar o limite | UUID ou outro identificador novo por abertura do aplicativo. |
| `current_content` | Não | Canal, filme ou série atual. |

## Respostas

Quando a conexão estiver liberada, a resposta inclui `success: true` e o resumo de sessão com `allowed: true`, quantidade ativa e limite configurado.

Quando o limite estiver cheio, o painel retorna HTTP `409`, com o código `CONNECTION_LIMIT_REACHED` e `session.allowed: false`. Nesse caso o APK deve impedir a reprodução e informar que o limite de conexões foi atingido.

> APKs que ainda não enviarem `session_id` continuam funcionando como antes. Eles não entram no bloqueio automático até serem atualizados.

## Compatibilidade com heartbeat v4

O endpoint `POST /api/v4/heartbeat.php` também aceita `session_id`, `app` e `mac` no JSON ou no payload codificado. A regra de retorno é igual: HTTP `409` e `CONNECTION_LIMIT_REACHED` quando a conexão adicional não for autorizada.
