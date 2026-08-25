// Documento técnico gerado a partir das rotas REST confirmadas no backend do Rencia App.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Integração Universal de APKs",
  author: "Manus AI",
  rhythm: "report",
  running-header: true,
)

#let base = "https://renciaapp.manus.space"

// ---------- Title page ----------
#page(margin: (top: 28%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 26pt, weight: "bold", fill: report-accent)[Integração Universal de APKs]
    #v(0.5em)
    #text(size: 13pt, fill: luma(80))[Rotas REST do Rencia App para servidor, mensagens, imagens, ícones e troca automática de listas]
    #v(2em)
    #line(length: 40%, stroke: 0.5pt + luma(160))
    #v(2em)
    #text(size: 11pt)[Documento técnico para desenvolvimento de APKs Android e TV Box \
    Base pública: #base \
    Data: #datetime.today().display("[day]/[month]/[year]")]
  ]
]

// ---------- Table of contents ----------
#page(numbering: none, header: none)[
  #outline(title: [Sumário], indent: 1.5em)
]

// ---------- Main body ----------
#counter(page).update(1)

= Objetivo

Este documento reúne as rotas *confirmadas* no backend atual do Rencia App que um APK precisa chamar para receber a configuração do painel: status do MAC, listas, mensagens, imagens, ícones, atualização e troca automática de lista. Use sempre HTTPS e JSON em UTF-8. Este PDF não contém senhas, chaves privadas nem dados de clientes.

#block(width: 100%, inset: 11pt, radius: 5pt, fill: rgb("F5F1E7"), stroke: 0.7pt + report-accent)[
  #text(weight: "bold", fill: report-accent)[Contrato recomendado] \
  Para um APK novo, use o ciclo universal: carregar configuração, iniciar heartbeat, consultar avisos, reportar falha real de reprodução e recarregar a lista somente quando o servidor indicar sincronização. Não fixe URLs de listas, imagens ou mensagens no código do APK.
]

== Base do servidor

Todas as rotas abaixo usam a mesma origem: `https://renciaapp.manus.space`.

O MAC deve ser enviado preferencialmente no formato `AA:BB:CC:DD:EE:FF`. O servidor aceita variações em várias rotas, mas o APK deve manter o formato com dois-pontos para preservar a consistência do cadastro e dos logs.

== Campos de controle que o APK deve respeitar

#table(
  columns: (1.25fr, 3.75fr),
  table.header([*Campo*], [*Comportamento no aplicativo*]),
  [`registered`], [Se for `false`, exiba tela de aparelho não cadastrado e não carregue conteúdo.],
  [`allowed`], [Se for `false`, não inicie reprodução; mostre bloqueio ou renovação.],
  [`status`], [Use o estado retornado pelo servidor, como `Liberado`, `Bloqueado` ou `Expirado`.],
  [`expiration_show_modal`], [Se for `true`, mostre o modal com `expiration_modal_title` e `expiration_modal_message`.],
  [`playlist_sync_required`], [Se for `true`, atualize as listas em segundo plano, preservando a tela quando possível.],
)

= Rotas essenciais para APKs novos

== Configuração completa por MAC

*Verbo HTTP:* `GET` \
*Rota:* `/api/v5/apps/{appId}/config?mac={MAC}`

Esta é a rota prioritária para aplicativos novos cadastrados no painel. Ela devolve nome do aplicativo, textos, links de renovação, logo, banner, fundo, imagem de mensagem, ícones, preferências do player e todas as URLs de listas ativas.

#table(
  columns: (1.35fr, 3.65fr),
  table.header([*Parâmetro*], [*Valor aceito*]),
  [`appId`], [Use `prestige`, `optimus`, `imperio`, `infinitus`, `supremus`, `evolux` ou `nexus`.],
  [`mac`], [MAC do aparelho cadastrado especificamente para aquele aplicativo.],
)

Exemplo de chamada: `GET https://renciaapp.manus.space/api/v5/apps/nexus/config?mac=AA:BB:CC:DD:EE:FF`.

#table(
  columns: (1.65fr, 3.35fr),
  table.header([*Campo da resposta*], [*Uso no APK*]),
  [`app_id` e `app_name`], [Identificação e nome exibido do aplicativo.],
  [`message_title` e `message_text`], [Mensagem configurada no painel; exiba somente quando algum campo estiver preenchido.],
  [`server_api_url`], [URL informativa de API/servidor configurada pelo painel.],
  [`block_title` e `block_message`], [Textos para bloqueio ou expiração.],
  [`renew_button_text` e `renew_button_url`], [Texto e link de renovação; abra o link no navegador externo.],
  [`logo_url`, `banner_url`, `background_url`], [Arquivos visuais dinâmicos. Se a URL vier vazia, use o visual padrão local.],
  [`message_image_url`], [Imagem opcional para modal de mensagens.],
  [`icons.live_tv`, `icons.movies`, `icons.series`], [Ícones dinâmicos de TV ao vivo, filmes e séries.],
  [`player`], [Opções de autoplay, rotação, qualidade, tentativas, idioma e recursos da interface.],
  [`playlist_urls`], [Lista ordenada de URLs ativas. Use a primeira como lista atual.],
)

#block(width: 100%, inset: 10pt, radius: 5pt, fill: rgb("F5F1E7"), stroke: 0.7pt + report-accent)[
  #text(weight: "bold", fill: report-accent)[Importante] \
  Hoje, a rota comum por MAC atende Prestige, Optimus, Império Play, Infinitus, Supremus, Evolux e Nexus. Ouro Pro, Fusion e Maximus usam contratos de compatibilidade próprios, descritos adiante.
]

== Atualização do aplicativo

*Verbo HTTP:* `GET` \
*Rota:* `/api/v5/apps/{appId}/update?mac={MAC}`

Consulte no início do aplicativo e novamente apenas quando o usuário abrir a área de atualização. A resposta fornece `version`, `url`, `apk_link`, `force_update`, `update_available` e `release_notes`. Quando `update_available` for verdadeiro, ofereça o download usando `url` ou `apk_link`.

Exemplo de chamada: `GET https://renciaapp.manus.space/api/v5/apps/nexus/update?mac=AA:BB:CC:DD:EE:FF`.

== Heartbeat e conteúdo assistido

*Verbo HTTP:* `GET` \
*Rota:* `/api/v5/heartbeat?mac={MAC}&current_content={TITULO}`

Chame imediatamente quando o usuário trocar de canal, filme ou série. Enquanto ele permanecer no mesmo conteúdo, envie novamente a cada *60 segundos*. Isso mantém o aparelho online e registra o que está sendo assistido no painel. Uma chamada sem `current_content` não apaga o último título salvo.

Exemplo de chamada: `GET https://renciaapp.manus.space/api/v5/heartbeat?mac=AA:BB:CC:DD:EE:FF&current_content=Canal%20Esporte`.

A resposta informa `success`, `contentUpdated`, `timestamp` e `command`. Quando `command` vier preenchido, execute somente comandos que o APK reconhece e envie a confirmação na rota de ACK de comandos.

== Avisos, vencimento e sincronização de lista

*Verbo HTTP:* `GET` \
*Rota:* `/api/v5/list-notifications?mac={MAC}`

Chame esta rota junto do heartbeat, a cada 60 segundos, e ao voltar o aplicativo ao primeiro plano. Ela centraliza avisos técnicos da lista, mensagem de vencimento e estado de failover.

#table(
  columns: (1.55fr, 3.45fr),
  table.header([*Campo da resposta*], [*Uso no APK*]),
  [`notifications`], [Avisos para exibir ao cliente. Cada item possui `id`, `status`, `severity`, `title`, `message`, `created_at` e `acknowledged`.],
  [`expiration`], [Objeto de vencimento com data, dias restantes, estado, chave do modal, título e mensagem.],
  [`failover_active`], [Indica se uma lista de reserva está ativa.],
  [`failover_state`], [Pode ser `primary`, `backup_active` ou `primary_restored`.],
  [`active_list_name` e `active_list_number`], [Lista que o APK deve tratar como ativa.],
  [`playlist_sync_required`], [Quando `true`, busque novamente a configuração/listas e aplique a alteração.],
  [`playlist_sync_mode`], [Hoje o modo é `background`: sincronize sem interromper a interface.],
  [`playlist_sync_message`], [Texto seguro para informar a troca automática de lista.],
  [`failover_transition_id`], [ID estável da transição; guarde localmente para não executar duas vezes.],
)

== Falha de reprodução e troca automática de lista

*Verbo HTTP:* `POST` \
*Rota:* `/api/v5/playback-failure` \
*Cabeçalho:* `Content-Type: application/json`

Corpo mínimo: `mac` e `active_list_number`. Exemplo: `POST /api/v5/playback-failure` com `mac: AA:BB:CC:DD:EE:FF` e `active_list_number: 1`.

Envie esta rota *somente* quando o player detectar erro real de rede, timeout ou indisponibilidade da lista. Não envie quando o usuário pausar ou quando ocorrer erro visual da interface. A resposta pode conter `switch_applied`, `message`, `failover_active`, `active_list_number`, `playlist_sync_required` e `failover_transition_id`.

Quando `switch_applied` ou `playlist_sync_required` vier como verdadeiro, chame de novo a rota de configuração da família do APK e carregue a lista que vier como ativa. Quando `failover_state` for `primary_restored`, sincronize em segundo plano e volte para a Lista 1.

= Imagens, ícones e mensagens

== Campos visuais da configuração universal

#table(
  columns: (1.5fr, 3.5fr),
  table.header([*Campo*], [*Uso obrigatório no APK*]),
  [`logo_url`], [Logo dinâmico. Se estiver vazio, use logo local.],
  [`banner_url`], [Banner de destaque da tela inicial.],
  [`background_url`], [Imagem de fundo. Baixe em cache sem bloquear a interface.],
  [`message_image_url`], [Imagem opcional para o modal de mensagens.],
  [`icons.live_tv`], [Ícone de TV ao vivo.],
  [`icons.movies`], [Ícone de filmes.],
  [`icons.series`], [Ícone de séries.],
  [`message_title` e `message_text`], [Mensagem de painel configurável.],
  [`block_title` e `block_message`], [Texto para tela de bloqueio/expiração.],
  [`renew_button_text` e `renew_button_url`], [Botão de renovação e destino externo.],
)

== Rotas visuais de compatibilidade

Estas rotas existem para APKs que ainda usam a interface legada. Para um APK novo, prefira os campos da configuração universal, evitando consultas visuais separadas.

#table(
  columns: (2.25fr, 1fr, 2.25fr),
  table.header([*Rota*], [*Verbo HTTP*], [*Função*]),
  [`/api/app-config`], [`GET`], [Visual geral: fundo, logo, banner, textos, contatos e ícones.],
  [`/api/v4/logo.php`], [`GET`], [Logo dinâmico do Ouro Pro legado; pode responder com redirecionamento.],
  [`/api/v4/bg.php`], [`GET`], [Fundo dinâmico legado.],
  [`/api/v4/icon/live_tv`], [`GET`], [Ícone de canais ao vivo.],
  [`/api/v4/icon/movies`], [`GET`], [Ícone de filmes.],
  [`/api/v4/icon/series`], [`GET`], [Ícone de séries.],
  [`/api/v4/icon/account`], [`GET`], [Ícone de conta.],
  [`/api/v4/icon/change_playlist`], [`GET`], [Ícone de troca de lista.],
  [`/api/carousel/list`], [`GET`], [Slides ativos, com título, tipo, URL e ordem.],
)

Para imagens e ícones, aceite URLs HTTPS e siga redirecionamentos HTTP 302. Faça cache de arquivos visuais, mas atualize o cache após nova resposta de configuração. Não trate uma URL visual como permanente.

= Fluxo comum para os APKs

== Na abertura do aplicativo

1. Leia o MAC real do aparelho.
2. Consulte a rota de configuração da família do APK.
3. Se `registered` for falso, exiba cadastro pendente e não carregue conteúdo.
4. Se `allowed` for falso, mostre bloqueio, vencimento e renovação quando existir.
5. Se permitido, aplique logo, fundo, banner, ícones e mensagens recebidos.
6. Carregue a primeira lista informada pelo servidor.
7. Inicie o ciclo de heartbeat e avisos a cada 60 segundos.

== No ciclo de 60 segundos

1. Chame `/api/v5/heartbeat` com MAC e conteúdo atual, quando houver.
2. Chame `/api/v5/list-notifications`.
3. Se `expiration_show_modal` for verdadeiro, exiba uma única vez para cada `expiration_modal_key`.
4. Mostre avisos ainda não confirmados em `notifications` e confirme cada leitura.
5. Se `playlist_sync_required` for verdadeiro, atualize as listas em segundo plano.
6. Se houver comando remoto, execute apenas comandos suportados e confirme o resultado.

== Ao detectar falha real no player

1. Envie `/api/v5/playback-failure` com MAC e número da lista atual.
2. Se `switch_applied` for verdadeiro, atualize configuração e lista imediatamente.
3. Se não houver lista reserva, exiba uma mensagem simples de indisponibilidade.
4. Não troque lista por conta própria fora da resposta do servidor.

= Confirmações de avisos e comandos

== Confirmação de aviso de lista

*Verbo HTTP:* `POST` \
*Rota:* `/api/v5/list-notifications/ack`

Envie `mac` e `alert_id` depois que o aviso for exibido. A resposta esperada é `success: true`. O ACK registra a leitura no aparelho e não apaga o aviso existente no painel.

== Busca e confirmação de comandos remotos

*Consulta:* `GET /api/v5/remote-commands?mac={MAC}` \
*Confirmação:* `POST /api/v5/remote-commands/ack`

No ACK, envie `mac`, `command_id`, `status` e, opcionalmente, `result_message`. O campo `status` aceita somente `executed` ou `failed`. Não confirme um comando que não foi executado pelo APK.

= Rotas de compatibilidade por família

== Maximus Player

#table(
  columns: (2.3fr, 2.7fr),
  table.header([*Rota*], [*Uso*]),
  [`GET /api/v5/check_mac.php?mac={MAC}`], [Consulta principal de MAC, status, expiração, playlists, logo, fundo, banner, contato e atualização. Atualize a cada 60 segundos enquanto estiver aberto.],
  [`GET /api/v5/get_playlists?mac={MAC}`], [Somente playlists; útil para recarregar depois de uma sincronização.],
  [`GET /api/v5/get_playlist_roku?mac={MAC}`], [Formato de playlists compatível com TV/Roku.],
  [`GET /api/v5/logo_roku`], [Logo do Maximus/TV.],
  [`GET /api/v5/bg_roku`], [Fundo do Maximus/TV.],
  [`GET /api/v5/roku_banners`], [Banners e slides do carrossel.],
  [`GET /api/v5/reseller_contact`], [Contato e links de suporte/renovação.],
  [`GET /api/v5/maximus-update?mac={MAC}`], [Atualização exclusiva do Maximus.],
)

== Fusion (Ultra Player)

#table(
  columns: (2.3fr, 2.7fr),
  table.header([*Rota*], [*Uso*]),
  [`GET /api/v5/ultra-config?mac={MAC}`], [Configuração do Fusion/Ultra: mensagens, imagens, ícones e opções de player.],
  [`GET /api/v5/ultra-update?mac={MAC}`], [Atualização do Fusion.],
)

== Ouro Pro legado

#table(
  columns: (2.3fr, 2.7fr),
  table.header([*Rota*], [*Uso*]),
  [`POST /api/guim.php`], [Protocolo legado codificado do BoxV3/Ouro Pro. Use somente se o APK já implementar o formato codificado dessa família.],
  [`GET /api/v4/update.php`], [Atualização do Ouro Pro legado.],
  [`POST /api/v4/heartbeat.php`], [Heartbeat legado com MAC e conteúdo assistido.],
  [`GET /api/app-config`], [Visual e textos de compatibilidade.],
  [`GET /api/v4/logo.php`, `/api/v4/bg.php` e `/api/v4/icon/{name}`], [Imagens e ícones legados.],
)

= Login e senha em APKs compatíveis

Quando o aplicativo usar acesso por login e senha em vez de MAC, utilize `POST /api/v5/app-login`.

Envie `username`, `password`, `appId` e, opcionalmente no primeiro acesso, `mac`. A resposta fornece `authenticated`, `registered`, `allowed`, `status`, `expiration_date`, `dns_host`, `dns_url`, `playlist_url`, `playlists` e a configuração visual do aplicativo.

No primeiro acesso, o servidor pode vincular o MAC ao cadastro permitido. Depois disso, uma tentativa de usar o mesmo login em outro aparelho deve respeitar a resposta de bloqueio do servidor.

= Boas práticas obrigatórias

#table(
  columns: (1.45fr, 3.55fr),
  table.header([*Tema*], [*Implementação*]),
  [Frequência], [Heartbeat e avisos a cada 60 segundos; envio imediato ao trocar de conteúdo e ao detectar erro real de reprodução.],
  [Cache], [Não use cache HTTP para status, mensagens, listas ou bloqueios. Para imagens, use cache local e atualize após nova configuração.],
  [Listas], [Somente o servidor decide a lista ativa. O APK deve obedecer `playlist_sync_required` e `active_list_number`.],
  [Mensagens], [Não mostre o mesmo modal de vencimento repetidamente; guarde `expiration_modal_key` até ela mudar.],
  [Privacidade], [Não grave nem envie senhas de listas em logs, analytics, telas de erro ou mensagens ao usuário.],
  [Resiliência], [Em falha de rede, mantenha o último visual e a última lista válida e tente novamente no próximo ciclo, sem apagar dados locais.],
)

= Origem e uso

As rotas e formatos deste PDF foram conferidos diretamente no backend atual do Rencia App, principalmente em `server/apiRoutes.ts`, `server/genericAppConfig.ts`, `server/apkListNotifications.ts`, `server/ultraPlayerConfig.ts` e `shared/appCatalog.ts`.

#block(width: 100%, inset: 11pt, radius: 5pt, fill: rgb("F5F1E7"), stroke: 0.7pt + report-accent)[
  #text(weight: "bold", fill: report-accent)[Entrega para o desenvolvedor] \
  Para um APK novo, a integração mínima é: configuração por MAC, heartbeat, avisos de lista, falha de reprodução, confirmação de avisos e atualização. As rotas de compatibilidade devem ser usadas somente pela família indicada neste documento.
]
