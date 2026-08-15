# Guia de Integração do Backend — Novos Aplicativos IPTV

**Base de produção:** `https://renciaapp.manus.space`

Este documento é o contrato técnico para qualquer novo aplicativo conectado ao painel Rencia. O aplicativo deve usar o **MAC do aparelho** como identificador em todas as chamadas e sempre utilizar HTTPS.

> **Regra principal:** o painel é a fonte de verdade para acesso, listas ativas, vencimento, bloqueio, avisos, comandos e atualização. O APK não deve liberar acesso ou escolher sozinho uma lista de reserva.

## 1. Fluxo mínimo obrigatório

Ao abrir o aplicativo, validar o aparelho e carregar as listas. Em seguida, carregar a aparência configurada quando o aplicativo tiver configuração visual própria. Durante o uso, manter o heartbeat a cada 60 segundos, consultar avisos e comandos remotos, e reportar imediatamente uma falha real de reprodução.

| Ordem | Ação | Rota |
|---|---|---|
| 1 | Validar o MAC e obter dados básicos | `GET /api/device/check?mac={MAC}` |
| 2 | Buscar listas e credenciais | `GET /api/guim.php?mac={MAC}` |
| 3 | Buscar identidade visual, quando aplicável | `GET /api/v5/ultra-config?mac={MAC}` |
| 4 | Registrar dispositivo e conteúdo assistido | `GET /api/v5/heartbeat?mac={MAC}&current_content={CONTEUDO}` |
| 5 | Ler vencimento, avisos e estado de failover | `GET /api/v5/list-notifications?mac={MAC}` |
| 6 | Consultar uma ordem remota pendente | `GET /api/v5/remote-commands?mac={MAC}` |
| 7 | Consultar atualização do APK | Rota específica do aplicativo |

## 2. Validação do aparelho e dados básicos

```text
GET https://renciaapp.manus.space/api/device/check?mac=AA:BB:CC:DD:EE:FF
```

Use esta rota antes de liberar a tela principal. Ela informa se o aparelho existe e se está liberado.

| Campo da resposta | Uso no APK |
|---|---|
| `found` | Indica se o MAC foi cadastrado no painel. |
| `allowed` | Só inicie a reprodução quando for `true`. |
| `status` | Estado atual, por exemplo `Liberado`, `Bloqueado` ou `Expirado`. |
| `app` | Aplicativo atribuído ao aparelho no painel. |
| `urlM3u8` | Lista principal cadastrada no aparelho, quando houver. |
| `urlEpg` | URL de EPG configurada para o aparelho, quando houver. |
| `dataExpiracao` | Data de vencimento em ISO. |

Quando `allowed` for `false`, interrompa a reprodução e mostre a mensagem de acesso indisponível sem expor detalhes internos do painel.

## 3. Listas e credenciais

```text
GET https://renciaapp.manus.space/api/guim.php?mac=AA:BB:CC:DD:EE:FF
```

Aliases compatíveis também existem em `/api/v4/guim.php` e `/api/v5/guim.php`.

Esta rota devolve o objeto `data`, contendo as fontes cadastradas para o aparelho. Cada item pode conter `id`, `mac`, `url`, `username`, `password` e `type`.

```json
{
  "data": [
    {
      "id": 123,
      "mac": "AA:BB:CC:DD:EE:FF",
      "url": "https://servidor.exemplo.com",
      "username": "usuario",
      "password": "senha",
      "type": "xtream"
    }
  ],
  "observador_api_url": "https://api-opcional.exemplo.com"
}
```

O APK deve apresentar as listas devolvidas pelo painel. Quando houver troca automática de lista, consulte a rota de avisos, atualize a playlist em memória e recarregue o conteúdo sem pedir que o cliente feche o aplicativo.

## 4. Aparência, imagens de fundo e ícones

Para aparelhos cadastrados como **Ultra Player**, busque a configuração visual exclusiva:

```text
GET https://renciaapp.manus.space/api/v5/ultra-config?mac=AA:BB:CC:DD:EE:FF
```

Principais campos retornados:

| Campo | Aplicação no APK |
|---|---|
| `app_name` | Nome exibido do aplicativo. |
| `logo_url` ou `ultra_logo_url` | Logo do aplicativo. |
| `banner_url` ou `ultra_banner_url` | Banner principal. |
| `background_url` ou `ultra_background_url` | Imagem de fundo. |
| `message_title`, `message_text`, `message_image_url` | Mensagem visual configurada no painel. |
| `icons.live_tv` | Ícone de canais/TV ao vivo. |
| `icons.movies` | Ícone de filmes. |
| `icons.series` | Ícone de séries. |
| `server_api_url` | URL de API adicional configurada para o Ultra Player. |
| `apk_download_url`, `apk_version` | Dados da atualização do Ultra Player. |

O APK deve usar as URLs diretamente e aceitar que um campo visual venha vazio. O painel pode alterar logo, fundo, banner e ícones sem que seja necessário publicar uma nova versão do APK.

> Para um **novo aplicativo com visual próprio**, informe ao responsável do painel o nome do aplicativo antes da integração. Assim será criada uma configuração visual isolada, sem reaproveitar ou misturar as imagens do Ultra Player.

## 5. Conteúdo assistido e presença online

```text
GET https://renciaapp.manus.space/api/v5/heartbeat?mac=AA:BB:CC:DD:EE:FF&current_content=Globo%20HD
```

Envie o heartbeat ao iniciar o aplicativo, ao mudar de canal, filme ou série, e a cada **60 segundos** enquanto o aparelho estiver ativo. Para manter o aparelho online sem mudar o conteúdo, envie somente `mac`.

| Parâmetro | Obrigatório | Regra |
|---|---:|---|
| `mac` | Sim | MAC do aparelho atual. |
| `current_content` | Não | Nome do canal, filme ou série em reprodução. Não envie vazio. |

O painel preserva o último conteúdo válido caso `current_content` não seja enviado. Dessa forma, o canal assistido permanece visível mesmo quando o cliente fica bastante tempo no mesmo conteúdo.

Como compatibilidade, também existe `POST /api/v4/heartbeat.php`, recebendo `mac`, `current_content`, `app_version` e `device_type`.

## 6. Vencimento, falha de lista e troca automática

```text
GET https://renciaapp.manus.space/api/v5/list-notifications?mac=AA:BB:CC:DD:EE:FF
```

Consulte ao iniciar o aplicativo e junto ao heartbeat, a cada 60 segundos. Essa resposta contém três grupos importantes.

| Grupo | Campos principais | Comportamento exigido do APK |
|---|---|---|
| Vencimento | `expiration.show_modal`, `modal_key`, `modal_title`, `modal_message`, `days_remaining` | Mostrar o modal apenas uma vez por `modal_key`. |
| Failover | `failover_active`, `failover_state`, `playlist_sync_required`, `playlist_sync_message`, `failover_transition_id` | Quando `playlist_sync_required` for `true`, buscar novamente as listas, atualizar em segundo plano e mostrar uma mensagem simples. |
| Alertas | `notifications[]` com `id`, `status`, `severity`, `title`, `message` | Mostrar apenas mensagens amigáveis ao cliente. Nunca exibir termos internos do painel. |

Exemplo de mensagem apropriada:

> “A lista principal apresentou instabilidade. Você foi conectado à lista de reserva. Quando normalizar, sua lista principal voltará automaticamente.”

Após mostrar um alerta com `id`, confirme a leitura:

```text
POST https://renciaapp.manus.space/api/v5/list-notifications/ack
Content-Type: application/json
```

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "alert_id": 123
}
```

## 7. Falha imediata durante a reprodução

Quando o player nativo detectar uma falha real, como stream interrompido ou erro de reprodução, informe o painel imediatamente. Não espere o monitoramento periódico.

```text
POST https://renciaapp.manus.space/api/v5/playback-failure
Content-Type: application/json
```

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "active_list_number": 1
}
```

Se a resposta indicar `switch_applied: true`, o aplicativo deve buscar novamente `/api/guim.php`, aplicar a lista priorizada e recarregar a sessão sem fechar o aplicativo. Proteja a chamada contra duplicação enquanto uma troca estiver em andamento.

## 8. Comandos remotos

O painel pode solicitar ações remotas ao aparelho. Consulte junto ao heartbeat:

```text
GET https://renciaapp.manus.space/api/v5/remote-commands?mac=AA:BB:CC:DD:EE:FF
```

Os comandos possíveis são `refresh_playlist`, `switch_playlist`, `update_dns`, `show_message`, `restart_player` e `sync_access`. Processe apenas um comando por vez, ignore comandos vencidos e confirme o resultado.

```text
POST https://renciaapp.manus.space/api/v5/remote-commands/ack
Content-Type: application/json
```

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "command_id": 456,
  "status": "executed",
  "result_message": "Playlist atualizada"
}
```

Use `status: "failed"` quando a ação não puder ser realizada.

## 9. Atualização do APK

Cada aplicativo possui URL de atualização independente. Nunca use a URL de um aplicativo para atualizar outro.

| Aplicativo | Endpoint | Campos de resposta |
|---|---|---|
| OuroPro | `GET /api/v4/update.php` | URL e versão configuradas no OuroPro. |
| Ultra Player | `GET /api/v5/ultra-update?mac={MAC}` | `url`, `apk_link`, `version`, `update_available`. |
| Maximus | `GET /api/v5/maximus-update?mac={MAC}` | `url`, `apk_link`, `version`, `update_available`. |

O aplicativo deve comparar a versão local com `version`. Quando `update_available` for verdadeiro, pode exibir um botão de atualização usando `url` ou `apk_link`.

## 10. Regras obrigatórias de implementação

| Regra | Obrigatório |
|---|---:|
| Usar HTTPS em todas as chamadas | Sim |
| Normalizar o MAC como `AA:BB:CC:DD:EE:FF` | Sim |
| Nunca gravar senha de lista ou dados sensíveis em log | Sim |
| Respeitar `allowed: false`, bloqueio e expiração | Sim |
| Não expor textos internos como “painel”, “modal” ou “Monitor de Listas” ao cliente | Sim |
| Consultar avisos, heartbeat e comandos a cada 60 segundos | Sim |
| Atualizar a playlist sem fechar o app quando houver failover | Sim |

## 11. Checklist de entrega do desenvolvedor

Antes de entregar a nova versão do aplicativo, o desenvolvedor deve demonstrar que o APK consegue validar MAC, carregar listas, respeitar bloqueio, enviar conteúdo assistido, mostrar vencimento, receber alertas de lista, trocar para reserva sem fechar, executar comando remoto e consultar sua própria URL de atualização.

> **Para criar uma configuração visual própria de outro aplicativo**, envie ao responsável do painel: nome do aplicativo, ícone, logo, fundo, banner, ícones de TV/filmes/séries e a URL de atualização. O painel então disponibiliza a configuração isolada para esse novo aplicativo.
