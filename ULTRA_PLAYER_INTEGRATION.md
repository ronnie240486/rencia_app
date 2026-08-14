# Integração do Ultra Player com o Rencia App

## Identificação do dispositivo

O APK deve enviar o MAC normalizado (`AA:BB:CC:DD:EE:FF`) em toda chamada. O painel cadastra o cliente com o aplicativo `Ultra Player`, preservando nome, telefone, MAC, status, vencimento e listas.

## Rotas já compatíveis

| Finalidade | Método e rota | Dados enviados | Resposta esperada |
|---|---|---|---|
| Buscar configuração e listas | `GET /api/guim.php?mac={MAC}` | MAC | Configuração, URLs de listas e mensagens do painel no formato protegido já usado pelo OuroPro. |
| Informar atividade | `POST /api/v4/heartbeat.php` | `mac`, `current_content`, `app_version`, `device_type` | Confirmação JSON. Enviar ao abrir, ao mudar de canal e periodicamente. |
| Consultar atividade | `GET /api/v4/heartbeat.php?mac={MAC}` | MAC | Estado recente do dispositivo. |
| Consultar atualização | `GET /api/v4/update.php` | MAC opcional | Link configurado para atualização do aplicativo. |

## Contrato de comportamento do APK

1. Ao abrir, solicitar a configuração pelo MAC e aplicar a lista prioritária retornada pelo painel.
2. O APK deve respeitar a ordem das listas. A Lista 1 é a principal; Lista 2 e Lista 3 são reservas quando o painel alterar a prioridade por failover.
3. Enviar heartbeat com a versão do Ultra Player e o conteúdo atual. Isso atualiza o status online, o relatório de versões e o campo “Assistindo”.
4. Exibir banner, mensagens e telas de bloqueio retornadas pelo painel; não armazenar credenciais em log.
5. Se o dispositivo estiver bloqueado ou expirado, exibir a mensagem de bloqueio recebida e não iniciar a reprodução.

## Configuração exclusiva do Ultra Player

O APK deve buscar sua aparência e seus textos pela rota `GET /api/v5/ultra-config?mac={MAC}`. Ela aceita o MAC com ou sem separadores e responde apenas para um dispositivo cadastrado como `Ultra Player` e com status `Liberado`.

| Campo retornado | Uso no APK |
|---|---|
| `app_name` ou `ultra_app_name` | Nome exibido do aplicativo. |
| `logo_url` ou `ultra_logo_url` | Logo configurado no painel. |
| `banner_url` ou `ultra_banner_url` | Banner configurado no painel. |
| `background_url` ou `ultra_background_url` | Imagem de fundo configurada no painel. |
| `message_title`, `message_text`, `message_image_url` e aliases `ultra_*` | Conteúdo do aviso configurável. |
| `impact_phrase` | Frase de destaque da tela inicial. |
| `server_api_url` | API externa definida no campo **API do Servidor**. |
| `apk_download_url`, `apk_version` | Link e versão da atualização configurada. |
| `icons.live_tv`, `icons.movies`, `icons.series` | Ícones personalizáveis dos botões **Canais**, **Filmes** e **Séries**. |

Em caso de MAC não cadastrado, aplicativo diferente, bloqueio ou vencimento, a rota devolve `allowed: false` ou uma resposta de erro. O APK deve interromper a reprodução e apresentar a mensagem apropriada nesses casos.

## Informações para enviar ao desenvolvedor

Forneça ao desenvolvedor o domínio publicado do painel, um MAC de teste cadastrado como `Ultra Player`, esta especificação e a exigência de que todas as chamadas usem HTTPS em produção. A URL base deve ficar configurável no APK para permitir troca de domínio sem nova compilação.
