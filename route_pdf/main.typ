#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Rencia App — Guia Universal de Rotas",
  author: "Manus AI",
  rhythm: "report",
  running-header: true,
)

#page(margin: (top: 28%, x: 2.1cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 26pt, weight: "bold", fill: report-accent)[Rencia App]
    #v(0.4em)
    #text(size: 18pt, weight: "bold")[Guia Universal de Rotas]
    #v(0.8em)
    #text(size: 13pt, fill: luma(80))[Mensagens, servidores IPTV, APKs, presença online, backups e integrações]
    #v(2em)
    #line(length: 42%, stroke: 0.6pt + luma(160))
    #v(2em)
    #text(size: 11pt)[Referência técnica para integração dos aplicativos e do painel]
    #v(0.6em)
    #text(size: 10pt, fill: luma(90))[Base principal: https://renciaapp.manus.space]
    #v(2em)
    #text(size: 10pt)[Autor: Manus AI]
    #text(size: 10pt)[Data: #datetime.today().display("[day]/[month]/[year]")]
  ]
]

#page(numbering: none, header: none)[
  #outline(title: [Sumário], indent: 1.5em)
]

#counter(page).update(1)

= Como usar este guia

Este documento reúne as rotas HTTP públicas e as procedures tRPC atualmente implementadas no Rencia App. Ele foi organizado para que o desenvolvedor de cada APK encontre rapidamente o contrato de que precisa. As rotas antigas foram mantidas no inventário por compatibilidade; não é recomendado trocar uma rota que já funciona sem testar o APK correspondente.

> *Regra principal:* cada aplicativo deve informar seu próprio identificador (`app` ou `app_id`) quando o mesmo MAC físico estiver cadastrado em mais de um APK. Isso impede que a atividade do Ouro Pro seja gravada no Future, Excellence, Magnus, Ominus ou em outro aplicativo.

#table(
  columns: (2.8cm, 12cm),
  inset: 7pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Item*], [*Valor*],
  [Base da API], [https://renciaapp.manus.space],
  [Formato recomendado], [JSON e HTTPS; usar `encodeURIComponent` nos parâmetros de texto],
  [Identificação], [MAC real + ID do aplicativo + `session_id` único por sessão],
  [Presença], [Heartbeat periódico enquanto o APK estiver aberto ou reproduzindo],
  [Isolamento], [O backend seleciona o cadastro pelo proprietário, MAC e aplicativo informado],
)

= Rotas essenciais para qualquer APK

== Presença e conteúdo em reprodução

O APK deve chamar o heartbeat a cada 60 segundos enquanto estiver aberto ou reproduzindo. Quando o canal, filme ou episódio mudar, envie o novo conteúdo imediatamente. O painel conserva o último conteúdo recebido e considera a atividade por até duas horas; o botão *Online agora* usa uma janela curta para mostrar somente os aparelhos ativos naquele momento.

#raw(read("heartbeat_example.txt"), lang: "text")

Se o APK ficar vários minutos no mesmo episódio, ele ainda deve continuar enviando heartbeat. Uma chamada única ao abrir o player não é suficiente. Quando o mesmo MAC estiver em vários aplicativos, `app` é obrigatório. Respostas HTTP `403` indicam vínculo incorreto e `409` com `APP_IDENTIFICATION_REQUIRED` indica que o APK precisa informar o aplicativo.

== Atualização do conteúdo

A rota abaixo pode ser usada quando o usuário muda de canal, filme ou episódio. Ela também renova o `lastSeen`, mas não substitui o heartbeat periódico.

#raw(read("update_watching_example.txt"), lang: "text")

== Consulta do conteúdo atual

#raw(read("current_watching_example.txt"), lang: "text")

== Controles remotos, notificações e failover

#raw(read("playback_example.txt"), lang: "text")

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`GET /api/v5/remote-commands?mac=...`], [Consultar um comando remoto pendente],
  [`POST /api/v5/remote-commands/ack`], [Confirmar execução de um comando recebido],
  [`GET /api/v5/list-notifications?mac=...`], [Buscar avisos técnicos confirmados para o MAC],
  [`POST /api/v5/list-notifications/ack`], [Marcar aviso do aplicativo como lido],
  [`POST /api/v5/playback-failure`], [Informar falha de reprodução e solicitar a próxima lista],
)

= Login, configuração e listas dos APKs

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`POST /api/v5/app-login`], [Login do aplicativo com MAC e credencial configurada],
  [`POST /api/v5/login`], [Login legado do ecossistema v5],
  [`POST /api/v5/reseller_login`], [Login legado de revenda],
  [`POST /api/v5/user_register`], [Registro compatível de usuário do APK],
  [`GET /api/v5/apps/:appId/discovery`], [Descobrir contrato e configuração pública de um aplicativo],
  [`GET /api/v5/apps/:appId/config?mac=...`], [Buscar listas, imagens, mensagens e configuração exclusiva do APK],
  [`GET /api/v5/apps/:appId/update?mac=...`], [Consultar versão e URL de atualização do APK],
  [`GET /api/v5/check_mac.php?mac=...`], [Verificar cadastro, validade e avisos associados ao MAC],
  [`GET /api/v5/mac_exists?mac=...`], [Verificar se o MAC existe],
  [`GET /api/v5/get_playlists?mac=...`], [Obter playlists do dispositivo],
  [`GET /api/v5/getdns_list`], [Obter destinos DNS configurados],
  [`GET /api/v5/get_playlist_roku?mac=...`], [Obter playlist compatível com Roku],
  [`GET /api/v5/device_status?mac=...`], [Consultar situação do dispositivo],
  [`GET /api/v5/list_devices`], [Listagem compatível de dispositivos],
)

== Contrato mínimo recomendado de configuração

Para novos aplicativos, use o identificador técnico do catálogo no parâmetro `appId` e envie o mesmo identificador no heartbeat. Não reutilize o cadastro de outro APK apenas porque o MAC físico é igual. O painel mantém os registros separados por aplicativo e proprietário.

#raw(read("config_example.txt"), lang: "text")

= Imagens, mensagens e atualização visual

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`GET /api/v4/logo.php?name=...`], [Ícone ou logo dinâmico],
  [`GET /api/v4/bg.php?name=...`], [Imagem de fundo dinâmica],
  [`GET /api/v4/icon/:name`], [Ícone visual configurado no painel],
  [`GET /api/v5/logo_roku`], [Logo para Roku],
  [`GET /api/v5/bg_roku`], [Fundo para Roku],
  [`GET /api/v5/roku_banners`], [Banners para Roku],
  [`GET /api/config_domain.json`], [Configuração pública de domínio],
  [`GET /config_domain.json`], [Compatibilidade de configuração de domínio],
  [`GET /api/app-config`], [Configuração geral pública do aplicativo],
  [`GET /api/v4/update.php` ou `/api/update.php`], [Atualização legada],
  [`GET /api/v5/ultra-config?mac=...`], [Configuração do Ultra/Fusion],
  [`GET /api/v5/ultra-update?mac=...`], [Atualização do Ultra/Fusion],
  [`GET /api/v5/maximus-update?mac=...`], [Atualização do Maximus],
)

As rotas de upload de imagem e APK são administrativas e não devem ser chamadas por APK de cliente. Elas aparecem no inventário completo ao final deste documento para manter a referência de tudo que foi implementado.

= Servidores IPTV, mensagens e vencimentos

A Central de Servidores IPTV é independente de Usuários. Seus registros não criam MAC, não alteram listas do painel e não misturam aplicativos. O cadastro possui pessoa, telefone, nome/endereço do servidor, vencimento, observação e status Pago/Não pago.

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Procedure tRPC*], [*Finalidade*],
  [`iptvServers.list`], [Listar somente os servidores da conta autenticada],
  [`iptvServers.create`], [Cadastrar servidor IPTV independente],
  [`iptvServers.update`], [Editar servidor sem tocar em clientes ou MACs],
  [`iptvServers.setPaymentStatus`], [Alternar Pago/Não pago],
  [`iptvServers.remove`], [Excluir somente o registro de servidor autorizado],
  [`iptvServers.prepareWhatsApp`], [Preparar mensagem individual pronta],
  [`iptvServers.runAlertsNow`], [Verificar vencimentos imediatamente],
  [`iptvServers.enableDailyAlerts`], [Ativar verificação diária de avisos],
  [`iptvServers.disableDailyAlerts`], [Pausar verificação diária],
  [`iptvServers.clearAlertHistory`], [Apagar histórico com confirmação],
  [`iptvServers.prepareWhatsAppBusiness`], [Manter preparação persistente para futura integração oficial],
)

A mensagem de vencimento deve usar somente o nome da pessoa e a data, sem servidor, lista ou endereço técnico. O envio automático real pelo WhatsApp depende de uma conexão oficial e de modelo aprovado pelo provedor; a mensagem pronta pode abrir o WhatsApp sem envio automático.

= Avisos automáticos e Heartbeat do painel

Os endpoints abaixo são chamados pelo serviço agendado do painel. Eles não devem ser simulados pelo APK nem substituídos por `setInterval` local.

#table(
  columns: (6.2cm, 8.6cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Endpoint*], [*Finalidade*],
  [`POST /api/scheduled/automatic-backup`], [Executar backup automático conforme configuração],
  [`POST /api/scheduled/history-retention`], [Limpar histórico operacional antigo segundo retenção],
  [`POST /api/scheduled/list-failover`], [Verificar falha e recuperação de listas],
  [`POST /api/scheduled/iptv-server-alerts`], [Gerar avisos idempotentes de vencimento de servidores],
)

A automação diária ocorre no backend hospedado. Para os APKs, presença é diferente de agendamento: o APK precisa chamar heartbeat durante a reprodução; o painel não consegue descobrir atividade que nunca foi enviada.

= Backup, importação e Google Drive

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`GET /api/v5/export-backup`], [Gerar backup completo atual],
  [`GET /api/v5/export-backup-v2`], [Gerar backup compatível com painel legado],
  [`POST /api/v5/preview-import-backup`], [Pré-visualizar importação antes de gravar],
  [`POST /api/v5/import-backup`], [Importar backup após validação],
  [`GET /api/backups/:snapshotId/download`], [Baixar snapshot autorizado],
  [`GET /api/google-drive/oauth/callback`], [Retorno da autorização do Google Drive],
)

O backup completo preserva clientes, MACs, listas, configurações e vínculos conforme o formato exportado. A importação deve ser pré-visualizada e feita somente na conta correta. Não compartilhe tokens, senhas, URLs privadas ou arquivos de backup publicamente.

= Portal de revenda e loja privada

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`POST /api/reseller-portal/login`], [Login local da revenda],
  [`POST /api/reseller-portal/me`], [Sessão e dados da revenda],
  [`POST /api/reseller-portal/dashboard`], [Resumo do painel da revenda],
  [`POST /api/reseller-portal/clients`], [Listar clientes próprios],
  [`POST /api/reseller-portal/client-save`], [Criar ou editar cliente próprio],
  [`POST /api/reseller-portal/client-status`], [Bloquear ou liberar cliente próprio],
  [`POST /api/reseller-portal/client-delete`], [Excluir cliente próprio],
  [`POST /api/reseller-portal/lists`], [Listar listas próprias],
  [`POST /api/reseller-portal/list-save`], [Criar ou editar lista própria],
  [`POST /api/reseller-portal/list-delete`], [Excluir lista própria],
  [`POST /api/reseller-portal/dns`], [Listar DNS permitido],
  [`POST /api/reseller-portal/dns-save`], [Salvar DNS permitido],
  [`POST /api/reseller-portal/dns-delete`], [Excluir DNS próprio],
  [`POST /api/reseller-portal/operations`], [Consultar operações liberadas],
  [`POST /api/reseller-portal/suggestion`], [Enviar sugestão ao proprietário],
  [`GET /api/public/apps`], [Catálogo público de aplicativos liberados],
  [`GET /api/store-invites/:token`], [Abrir loja por convite],
)

O isolamento por proprietário e revenda é obrigatório: a sessão deve ver e alterar somente os clientes, MACs, listas e aplicativos autorizados para ela. A loja por convite deve mostrar apenas os aplicativos liberados no convite.

= Compatibilidade legada e diagnóstico

#table(
  columns: (5.1cm, 9.7cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Rota*], [*Finalidade*],
  [`POST /api/guim.php` e `GET /api/guim.php`], [Contrato legado de configuração e atualização],
  [`POST /api/v4/guim.php` e `GET /api/v4/guim.php`], [Contrato v4 compatível],
  [`POST /api/v5/guim.php` e `GET /api/v5/guim.php`], [Contrato v5 compatível],
  [`POST /api/main.php`], [Contrato legado principal],
  [`GET /player`], [Compatibilidade de player],
  [`GET /player_api.php`], [Compatibilidade de API do player],
  [`GET /api/health`], [Saúde básica do backend],
  [`GET /api/users`], [Consulta administrativa compatível],
  [`GET /api/nuvix/config/:ownerId`], [Configuração Nuvix por proprietário],
  [`GET /apk` e `GET /ouropro`], [Rotas de compatibilidade para páginas/APKs],
  [`POST /api/chatbot/test`], [Teste administrativo de chatbot],
  [`POST /api/chatbot/revendas`], [Operação administrativa de chatbot para revendas],
)

= Inventário completo extraído do backend

A seção seguinte é o inventário bruto das rotas encontradas no código, incluindo aliases mantidos por compatibilidade. Os contratos detalhados e as regras de segurança das rotas sensíveis devem ser conferidos no código do servidor antes de uma integração nova.

== Rotas HTTP

#raw(read("http_routes.txt"), lang: "text")

== Procedures tRPC

#raw(read("trpc_routes.txt"), lang: "text")

= Checklist de integração do APK

#table(
  columns: (0.8cm, 14cm),
  inset: 6pt,
  fill: (x, y) => if y == 0 { report-accent.lighten(70%) } else { white },
  [*Nº*], [*Verificação*],
  [1], [Usar HTTPS e o domínio atual configurado para o painel.],
  [2], [Enviar MAC real, normalizado pelo próprio servidor, sem trocar o MAC entre aplicativos.],
  [3], [Enviar `app` ou `app_id` correto em cada heartbeat quando houver cadastros duplicados por aplicativo.],
  [4], [Gerar `session_id` UUID ao iniciar uma sessão e reutilizá-lo até fechar o APK.],
  [5], [Chamar heartbeat a cada 60 segundos durante a reprodução.],
  [6], [Enviar `current_content` ao iniciar e ao trocar canal, filme ou episódio.],
  [7], [Tratar `403`, `409` e `CONNECTION_LIMIT_REACHED` sem esconder silenciosamente o erro.],
  [8], [Não apagar o último conteúdo quando o heartbeat vier sem texto; vazio significa que não há atualização de título.],
  [9], [Testar o APK em celular e TV Box, porque o tipo de dispositivo pode alterar o caminho visual.],
  [10], [Não enviar credenciais, tokens ou URLs privadas em logs públicos.],
)

= Referência de segurança e preservação

As rotas administrativas usam autenticação e isolamento por proprietário. As rotas públicas de APK recebem apenas os dados necessários para o funcionamento do aplicativo. A existência de uma rota pública não significa que ela permita editar o painel. Qualquer alteração de banco, cliente, MAC, lista, validade, credencial ou configuração deve ser feita somente por uma operação autorizada e validada.

Este guia foi gerado a partir do inventário atual do projeto em #datetime.today().display("[day]/[month]/[year]"). Rotas legadas permanecem documentadas para facilitar manutenção, mas a integração nova deve preferir os contratos v5 e o identificador explícito do aplicativo.

#pagebreak()
= Exemplos de referência

#raw(read("response_examples.txt"), lang: "text")
