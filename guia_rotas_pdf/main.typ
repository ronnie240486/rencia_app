// Manual técnico unificado — gerado a partir das rotas implementadas no Rencia App.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Manual Unificado de Rotas dos Aplicativos",
  author: "Rencia App",
  rhythm: "report",
  running-header: true,
)

#page(margin: (top: 28%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 25pt, weight: "bold", fill: report-accent)[Manual Unificado de Rotas]
    #v(0.55em)
    #text(size: 14pt, fill: luma(82))[Ouro Pro · Fusion · Maximus Player · Prestige · Optimus · Império Play · Infinitus · Supremus · Evolux]
    #v(2em)
    #line(length: 44%, stroke: 0.6pt + luma(160))
    #v(2em)
    #text(size: 11pt)[Rencia App \
    Base de produção: https://renciaapp.manus.space \
    Emitido em #datetime.today().display("[day]/[month]/[year]")]
  ]
]

#page(numbering: none, header: none)[
  #outline(title: [Sumário], indent: 1.5em)
]

#counter(page).update(1)

= Finalidade e regras de integração

Este é o contrato único para os desenvolvedores dos aplicativos conectados ao painel Rencia. Todas as chamadas usam *HTTPS*, o MAC é o identificador do aparelho e o painel é a fonte de verdade para acesso, listas, bloqueio, vencimento, mensagens, comandos, failover e atualizações.

> O APK nunca deve liberar um aparelho somente porque existe uma lista local. Ele deve respeitar o campo `allowed`, consultar o painel periodicamente e manter a lista ativa definida pelo painel.

#table(
  columns: (1.3fr, 2.2fr, 2.8fr),
  table.header([*Regra*], [*Frequência*], [*Comportamento obrigatório*]),
  [Validação por MAC], [Ao abrir e ao retomar], [Não reproduzir quando `allowed` for falso.],
  [Heartbeat], [Ao abrir, ao mudar conteúdo e a cada 60 s], [Manter o aparelho online e o conteúdo assistido atualizado.],
  [Avisos e comandos], [Junto do heartbeat, a cada 60 s], [Mostrar avisos amigáveis, trocar lista em segundo plano e executar comandos válidos.],
  [Falha nativa], [Imediatamente ao ocorrer], [Reportar falha real de reprodução; não esperar o ciclo de monitoramento.],
)

== Padrão de MAC e respostas vazias

Envie MAC preferencialmente como `AA:BB:CC:DD:EE:FF`. O painel aceita a normalização e retorna textos opcionais como string vazia, nunca como a palavra visível `null`. O aplicativo também deve tratar campo vazio como ausência de conteúdo, sem exibir mensagem de erro ao cliente.

= Rotas principais do Ouro Pro

== Cadastro, acesso e listas

*Rota principal compatível com Ouro Pro*

#raw(block: true, lang: "text", "POST https://renciaapp.manus.space/api/guim.php")

O Ouro Pro legado usa o formato BoxV3 codificado. O corpo contém o campo `data` com a carga que inclui o identificador do aparelho. A resposta também retorna `data` codificado. O aplicativo deve usar o mesmo codificador/decodificador nativo do projeto Ouro Pro.

Para implementações que usam consulta simples por MAC, há compatibilidade em:

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/guim.php?mac={MAC}\nGET https://renciaapp.manus.space/api/v4/guim.php?mac={MAC}\nGET https://renciaapp.manus.space/api/v5/guim.php?mac={MAC}")

A resposta contém as listas e credenciais atribuídas ao aparelho. Quando a playlist é enviada no formato GPCPRO/Flutter, os campos esperados são `playlist_url` e `playlist_name`; não substitua esses nomes por `url` e `name`.

== Validação simplificada do aparelho

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/device/check?mac={MAC}")

#table(
  columns: (1.4fr, 3.7fr),
  table.header([*Campo*], [*Uso no APK*]),
  [`found`], [Indica se o MAC existe no painel.],
  [`allowed`], [Só inicie reprodução quando verdadeiro.],
  [`status`], [Estado do acesso, como Liberado, Bloqueado ou Expirado.],
  [`app`], [Aplicativo atribuído ao cliente.],
  [`urlM3u8`, `urlEpg`], [Lista principal e EPG quando configurados.],
  [`dataExpiracao`], [Data de validade cadastrada no painel.],
)

== Recursos visuais Ouro Pro

#raw(block: true, lang: "text", "GET /api/app-config\nGET /api/v4/logo.php\nGET /api/v4/bg.php\nGET /api/v4/icon/{name}")

`/api/app-config` devolve logo, banner, fundo, textos de suporte, frase de impacto e ícones. A rota de ícones aceita `live_tv`, `movies`, `series`, `account`, `change_playlist`, `settings`, `reload` e `exit`. O APK deve aceitar URL vazia sem quebrar a interface.

= Rotas do Fusion

O Fusion usa a integração isolada que antes se chamava Ultra Player. Não misture suas imagens, nomes ou atualização com o Ouro Pro.

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/ultra-config?mac={MAC}\nGET https://renciaapp.manus.space/api/v5/ultra-update?mac={MAC}")

`ultra-config` retorna `app_name`, `logo_url`, `banner_url`, `background_url`, `message_title`, `message_text`, `message_image_url`, `icons.live_tv`, `icons.movies`, `icons.series`, `server_api_url`, `apk_download_url` e `apk_version`. O APK deve buscar a configuração ao iniciar e aplicar as alterações visuais sem precisar publicar uma nova versão.

`ultra-update` retorna `url`, `apk_link`, `version` e `update_available`. Compare a versão local com `version` e só exiba atualização quando o sinal retornar disponível.

= Rotas do Maximus Player

== Configuração por MAC

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/check_mac.php?mac={MAC}")

Esta é a rota de configuração do Maximus. Ela devolve acesso, listas e o campo `dns_url`, que contém a URL cadastrada em *API do Servidor*. O campo explícito `test_api_url` também está disponível para o fluxo de teste. O APK consulta o painel antes de usar essa URL; não deve fixar o endereço no código.

== Atualização e teste automático

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/maximus-update?mac={MAC}\nPOST https://renciaapp.manus.space/api/v5/maximus-test-result")

`maximus-update` retorna a URL e versão exclusivas do Maximus. A rota `maximus-test-result` recebe o resultado final de um teste concluído. Quando recebe um MAC novo e um nome válido, o painel cria o cliente bloqueado como `Nome (teste)`; reenvios do mesmo MAC atualizam o mesmo teste e não duplicam cliente real.

#raw(block: true, lang: "json", "{\n  \"mac\": \"AA:BB:CC:DD:EE:FF\",\n  \"name\": \"Cliente Exemplo\",\n  \"phone\": \"5511999999999\",\n  \"status\": \"online\",\n  \"source\": \"maximus\"\n}")

Quando uma API externa de teste for usada, o Maximus deve primeiro ler `dns_url`/`test_api_url` do painel, enviar o POST exigido por essa API externa e somente depois chamar `maximus-test-result` quando o teste tiver concluído.

= Rotas comuns de presença, conteúdo e vencimento

== Heartbeat e conteúdo assistido

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/heartbeat?mac={MAC}&current_content={TITULO}\nPOST https://renciaapp.manus.space/api/v4/heartbeat.php")

Envie ao abrir, ao trocar canal/filme/série e a cada 60 segundos enquanto o player estiver ativo. Se o conteúdo não mudar, envie apenas o MAC: o painel preserva o último título válido. A compatibilidade v4 aceita `mac`, `current_content`, `app_version` e `device_type`.

Também existe uma consulta somente de leitura:

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/current-watching?mac={MAC}")

== Vencimento, mensagens e failover

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/list-notifications?mac={MAC}\nPOST https://renciaapp.manus.space/api/v5/list-notifications/ack")

Consulte ao iniciar e a cada 60 segundos. A resposta reúne três áreas:

#table(
  columns: (1.35fr, 2.2fr, 2.75fr),
  table.header([*Grupo*], [*Campos relevantes*], [*Ação do aplicativo*]),
  [Vencimento], [`expiration.show_modal`, `modal_key`, `modal_title`, `modal_message`, `days_remaining`], [Mostrar uma vez por `modal_key`; exemplos: vence amanhã, vence hoje e acesso vencido.],
  [Failover], [`failover_active`, `playlist_sync_required`, `playlist_sync_message`, `failover_transition_id`], [Recarregar playlists em segundo plano, manter o player aberto e informar o cliente com mensagem simples.],
  [Avisos], [`notifications[]` com `id`, `severity`, `title`, `message`], [Exibir só mensagens amigáveis e confirmar a leitura do aviso.],
)

Confirmação de leitura:

#raw(block: true, lang: "json", "POST /api/v5/list-notifications/ack\n{ \"mac\": \"AA:BB:CC:DD:EE:FF\", \"alert_id\": 123 }")

== Falha imediata de reprodução

#raw(block: true, lang: "json", "POST https://renciaapp.manus.space/api/v5/playback-failure\n{ \"mac\": \"AA:BB:CC:DD:EE:FF\", \"active_list_number\": 1 }")

Use somente em falha real do player nativo: stream interrompido, erro de reprodução ou indisponibilidade confirmada. Quando `switch_applied` for verdadeiro, busque as listas novamente e recarregue a playlist ativa sem fechar o aplicativo. HTTP 403 de servidor protegido não deve ser tratado como prova de falha ou de recuperação.

= Comandos remotos e sincronização

#raw(block: true, lang: "text", "GET  https://renciaapp.manus.space/api/v5/remote-commands?mac={MAC}\nPOST https://renciaapp.manus.space/api/v5/remote-commands/ack")

Comandos possíveis: `refresh_playlist`, `switch_playlist`, `update_dns`, `show_message`, `restart_player` e `sync_access`. Execute um comando por vez, ignore itens vencidos e responda com `executed` ou `failed`.

#raw(block: true, lang: "json", "{\n  \"mac\": \"AA:BB:CC:DD:EE:FF\",\n  \"command_id\": 456,\n  \"status\": \"executed\",\n  \"result_message\": \"Playlist atualizada\"\n}")

= Prestige, Optimus, Império Play, Infinitus, Supremus e Evolux

Os seis novos aplicativos usam o mesmo contrato comum, mas cada um possui imagens, textos, API e atualização isolados no painel.

#table(
  columns: (1.4fr, 2fr, 2.9fr),
  table.header([*Identificador*], [*Nome*], [*Rota de configuração*]),
  [`prestige`], [Prestige], [`/api/v5/apps/prestige/config?mac={MAC}`],
  [`optimus`], [Optimus], [`/api/v5/apps/optimus/config?mac={MAC}`],
  [`imperio`], [Império Play], [`/api/v5/apps/imperio/config?mac={MAC}`],
  [`infinitus`], [Infinitus], [`/api/v5/apps/infinitus/config?mac={MAC}`],
  [`supremus`], [Supremus], [`/api/v5/apps/supremus/config?mac={MAC}`],
  [`evolux`], [Evolux], [`/api/v5/apps/evolux/config?mac={MAC}`],
)

Para qualquer identificador acima, a atualização usa:

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/v5/apps/{appId}/update?mac={MAC}")

O endpoint de configuração retorna `registered`, `allowed`, `app_id`, `app_name`, imagem de logo/banner/fundo, imagem de mensagem, ícones, bloqueio, renovação, parâmetros do player, `server_api_url`, `apk_download_url`, `apk_version` e `playlist_urls`. O APK deve respeitar a associação do MAC ao aplicativo: um MAC cadastrado em outro app recebe bloqueio de contrato.

= Outras rotas úteis de compatibilidade

#table(
  columns: (2.35fr, 1.6fr, 2.35fr),
  table.header([*Rota*], [*Verbo HTTP*], [*Finalidade*]),
  [`/api/v4/update.php` e `/api/update.php`], [GET], [Atualização do Ouro Pro; a segunda rota mantém compatibilidade com TV Box.],
  [`/api/v5/mac_exists?mac={MAC}`], [GET], [Consulta de existência de MAC para fluxos compatíveis.],
  [`/api/v5/check_expire.php?mac={MAC}`], [GET], [Compatibilidade de validade para players legados.],
  [`/api/v5/get_playlists?mac={MAC}`], [GET], [Consulta de playlists para integrações que usam esta rota compatível.],
  [`/api/v5/get_playlist_roku?mac={MAC}`], [GET], [Playlist para clientes Roku compatíveis.],
  [`/api/v5/logo_roku`, `/api/v5/bg_roku`, `/api/v5/roku_banners`], [GET], [Recursos visuais de clientes Roku.],
  [`/api/v5/getdns_list`], [GET], [Lista de DNS disponível para integrações compatíveis.],
)

= Loja pública e downloads

#raw(block: true, lang: "text", "GET https://renciaapp.manus.space/api/public/apps")

A rota retorna o catálogo público com nome, versão, logo e link de download. A página pública completa é `/d` e os atalhos individuais são: `/o` Ouro Pro, `/u` Fusion, `/m` Maximus, `/p` Prestige, `/x` Optimus, `/i` Império Play, `/n` Infinitus, `/s` Supremus e `/e` Evolux.

= Upload de imagens e APKs

#raw(block: true, lang: "text", "POST /api/upload-image\nContent-Type: multipart/form-data\nCampos: image=<arquivo>, field=<chave de configuração>")

O upload aceita somente imagem. Para os novos aplicativos, use chaves como `prestige_logo_url`, `prestige_banner_url`, `prestige_background_url`, `prestige_message_image_url`, `prestige_icon_live_tv_url`, `prestige_icon_movies_url` e `prestige_icon_series_url`; substitua o prefixo pelos demais identificadores. A resposta fornece a URL que deve ser salva e aplicada pelo painel.

O painel também possui `POST /api/upload-apk` para os fluxos internos autorizados de upload de APK. Não exponha credenciais, senhas de listas ou comandos administrativos em logs do aplicativo.

= Checklist obrigatório para entrega de um APK

#table(
  columns: (0.55fr, 5.75fr),
  table.header([*OK*], [*Validação exigida*]),
  [—], [MAC validado e acesso bloqueado quando `allowed` for falso.],
  [—], [Listas carregadas pelo painel e recarregadas silenciosamente em failover.],
  [—], [Heartbeat enviado na abertura, troca de conteúdo e a cada 60 segundos.],
  [—], [Avisos de vencimento, falha de lista e comandos remotos processados sem expor termos internos.],
  [—], [Falha real de reprodução reportada em `playback-failure`.],
  [—], [Atualização consultada somente na rota exclusiva do próprio aplicativo.],
  [—], [Imagens, ícones, mensagem, bloqueio e renovação lidos da configuração por MAC.],
  [—], [Nenhum texto `null`, senha ou URL sensível é exibido ao usuário final.],
)

== Observação final

> Para qualquer aplicativo novo, use o identificador criado no painel, cadastre o cliente com esse aplicativo e implemente as rotas comuns de runtime. Dessa forma, listas, avisos, vencimento e failover continuam centralizados e isolados por MAC.
