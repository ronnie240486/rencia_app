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

## Próxima rota específica do Ultra Player

O painel terá uma rota de configuração dedicada para banner, ícones, mensagens e API do servidor. O desenvolvedor deve deixar a URL base configurável para receber a rota final sem necessidade de nova compilação.

## Informações para enviar ao desenvolvedor

Forneça a ele o domínio publicado do painel, um MAC de teste cadastrado como `Ultra Player`, esta especificação e a exigência de que todas as chamadas usem HTTPS em produção.
