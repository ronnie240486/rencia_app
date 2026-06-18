# Rencia App - TODO

## Backend
- [x] Schema do banco de dados com tabela users (já existe, verificar campos)
- [x] Procedure: listar todos os usuários (admin only)
- [x] Procedure: buscar/filtrar usuários por nome, email ou role
- [x] Procedure: estatísticas do dashboard (total, admins, users comuns)
- [x] Procedure: atualizar role de um usuário (admin only)
- [x] Procedure: obter perfil do usuário autenticado

## Frontend - Design System
- [x] Configurar paleta de cores elegante (tons escuros/neutros sofisticados)
- [x] Tipografia refinada com Google Fonts
- [x] Global CSS com variáveis de design
- [x] DashboardLayout com sidebar de navegação lateral responsiva

## Frontend - Páginas
- [x] Página de Login (redirect para OAuth)
- [x] Dashboard com cards de estatísticas (total, admins, users)
- [x] Página de listagem de usuários com tabela completa
- [x] Busca e filtro de usuários (nome, email, role)
- [x] Gerenciamento de roles (promover/rebaixar usuários)
- [x] Página de perfil do usuário autenticado

## Qualidade
- [x] Layout responsivo em todos os tamanhos de tela
- [x] Estados de loading e erro em todas as páginas
- [x] Testes Vitest para procedures principais
- [x] Checkpoint final salvo

## Bugs
- [x] Após login OAuth, usuário é redirecionado para a tela de boas-vindas em vez do dashboard
- [x] Cookie de sessão não enviado após login OAuth (corrigido: sameSite=lax em dev proxy)

## Funcionalidades do gerenciaapp.top (nova fase)
- [x] Schema: tabela devices (mac, nome_server, tipo, app, url_m3u8, url_epg, valor, status, data_cadastro, data_expiracao, owner_id)
- [x] Schema: tabela apps (nome, icone_url, total_clientes)
- [x] Procedure: listar devices com busca, filtro e paginação
- [x] Procedure: criar device (cadastro)
- [x] Procedure: editar device
- [x] Procedure: deletar device (individual)
- [x] Procedure: deletar devices expirados
- [x] Procedure: ações em massa (deletar selecionados)
- [x] Procedure: stats do dashboard (total devices, revendas, ultra masters, masters, receita mensal)
- [x] Procedure: ranking de apps (top apps por clientes)
- [x] Dashboard: cards de estatísticas (Total Usuários, Revendas, Ultra Masters, Masters, Receita Mensal)
- [x] Dashboard: seção Apps liberados no plano
- [x] Dashboard: Troféu Top Apps com ranking visual (Ouro/Prata/Bronze)
- [x] Dashboard: tabela Informações do meu plano
- [x] Dashboard: Últimos Usuários Cadastrados (mini tabela com busca)
- [x] Página de lista de usuários com tabela completa (MAC, Nome, Tipo, Valor, Status, Datas, Ações)
- [x] Busca e filtro na lista de usuários
- [x] Seleção em massa com checkboxes
- [x] Botão Deletar Usuários Expirados
- [x] Paginação na lista de usuários
- [x] Formulário de cadastro de device (Modo, MAC, Nome, M3U8, App, URL EPG, Valor, Data Expiração)
- [x] Formulário de edição de device
- [x] Corrigir bug de autenticação (trust proxy / cookie - sameSite=lax em dev proxy)
- [x] Header com ID do usuário, Validade e Limite de Devices

## Novas Funcionalidades (03/05)
- [x] Renomear IBO Revenda para Ouro Revenda no schema, backend e frontend
- [x] Criar página de edição de device (/users/:id/edit)
- [x] Integrar APK com backend publicado (substituir URL do servidor)

## Bugs (03/05 - fase 2)
- [x] Erro removeChild em todas as páginas ao clicar em botões (extensões de browser conflitam com React)

## Bugs APK (03/05 - fase 3)
- [x] Nome "IBO Revenda" ainda aparece dentro do APK (smali não foi alterado)
- [x] APK com mesmo package name impede instalação paralela ao app original

## Correção APK Network Error (03/05 - fase 4)
- [x] Descoberta causa raiz: servidor retornava JSON direto, APK espera {"data": "<string codificada>"}
- [x] Implementar função encodeForApk() com algoritmo Security.getDecodedString do APK
- [x] Corrigir endpoint /api/guim.php para retornar resposta no formato correto
- [x] Adicionar testes Vitest para encodeForApk/getDecodedString

## Novas funcionalidades (06/05/2026)
- [x] DNS em massa: botão "Trocar DNS de todos" na tela de usuários com dialog
- [x] XteamCode: campos separados (Usuário, Senha, URL servidor) quando modoSelecao=XTeamCode
- [x] Corrigir guim.php: adicionar campo `words` com dados do painel (tela de bloqueio dinâmica)
- [x] Corrigir erro TS: função buildWords não encontrada em apiRoutes.ts
- [ ] APK v26: recompilar com Open Website→Conectar, Ibo Player removido, ic_setting dourado, logo lateral

## Novas funcionalidades (06/05/2026 - v2)
- [ ] Schema: tabela device_urls (id, device_id, nome, url_m3u8, xt_server, xt_username, xt_password, modo, ordem, ativo)
- [ ] Schema: coluna reseller_id na tabela users (quem criou esse revendedor)
- [ ] Schema: coluna plano_limite_devices e plano_limite_revendas na tabela users
- [ ] Procedure: CRUD de device_urls (adicionar/editar/remover listas de um device)
- [ ] Procedure: guim.php retornar múltiplas URLs
- [ ] Procedure: listar revendas do Ultra Master (users onde reseller_id = meu id)
- [ ] Procedure: criar/editar/deletar revendas
- [ ] Procedure: stats de revendas (total devices dos meus revendedores)
- [ ] Frontend: MAC com formatação automática (inserir : a cada 2 dígitos)
- [ ] Frontend: múltiplas listas no formulário de criação/edição de device
- [ ] Frontend: página de gerenciamento de revendas (/revendas)
- [ ] Frontend: rota /revendas no App.tsx e sidebar

## Novas funcionalidades (07/05/2026)
- [ ] Página pública /m3u8 sem login para trocar DNS (igual gerenciaapp.top)
- [ ] Trocar DNS em massa: seleciona DNS existente → substitui por nova (só afeta quem tinha aquela DNS)
- [ ] Múltiplas listas já no formulário de cadastro de usuário (campo adicionar lista)
- [ ] APK: corrigir ícones de botões (reload, exit, configurações dourado)
- [ ] APK: recompilar v26 com todas as correções

## Novas funcionalidades (08/05/2026)
- [ ] Ícone de settings no painel: corrigir endpoint /api/v4/icon/:name para proxy HTTP 200 correto
- [ ] Página de Perfil: foto de perfil no topo + campos editáveis (login, senha, email, telefone)
- [ ] Dashboard: seção "Dispositivos Conectados" mostrando quem está online no OuroPro
- [ ] Botões dourados (golden) em todo o painel
- [ ] "Cadastrar DNS" button na página DNS em Massa
- [ ] APK v26: recompilar com txt_impact/txt_contact visíveis na home screen

## Novas funcionalidades (12/05/2026)
- [x] Schema: adicionar coluna `telefone` na tabela devices (VARCHAR 20)
- [ ] Schema: adicionar coluna `data_vencimento` na tabela devices (se não existir)
- [x] Formulário de cadastro: campo telefone (+55 fixo) para clientes novos
- [x] Formulário de edição: campo telefone para clientes já cadastrados
- [x] Configurações: aba "Banner" com upload de foto de banner (igual ao logo)
- [x] Configurações: aba "Tema" com paleta de cores dos botões (presets + HEX personalizado)
- [x] Configurações: remover aba/seção "Mudar Ícones" (não funciona)
- [x] Configurações: remover aba/seção "Tela de Bloqueio" (não funciona)
- [x] Chatbot: envio automático de mensagem de vencimento via WhatsApp (X dias antes do vencimento)
- [x] Chatbot: campo para configurar quantos dias antes do vencimento enviar o aviso
- [x] Chatbot: campo para configurar a mensagem de aviso de vencimento
- [x] Chatbot: job periódico que verifica vencimentos e dispara mensagens (manual via botão, links WhatsApp gerados)

## Novas funcionalidades (12/05/2026 - v2)
- [x] Perfil: botão de upload para mudar o banner superior da página de perfil
- [x] Configurações: campo para cadastrar link do APK (URL de download do .apk)
- [x] Configurações: endpoint /api/v4/update.php que retorna o link do APK atual (consumido pelo app ao clicar em "Atualizar Aplicativo")

## Novas funcionalidades (12/05/2026 - v3)
- [x] Logo: recriar logo OuroPro mantendo coroa dourada, trocar texto "Ouro Revenda" por "OuroPro"
- [x] Painel: trocar todas as ocorrências de "IboPlayer Pro" por "OuroPro"
- [x] Dashboard: mostrar canal/série/filme que o dispositivo está assistindo na tabela de online
- [x] Configurações: paleta de cores para trocar a cor do painel (sidebar background + primary)

## Correções (12/05/2026 - v4)
- [ ] API /api/guim.php: incluir telefone de contato, frase de impacto e frase legal no response (campos str_whatsapp, impact_phrase, legal_notice)
- [ ] Configurações: garantir campos "Telefone de contato", "Frase de impacto" e "Frase legal (tela de bloqueio)" visíveis e salvando corretamente
- [ ] Frase legal padrão: "OuroPro is a media player application. The app does not provide or include any media or content."

## Heartbeat de conteúdo assistido (12/05/2026 - v5)
- [x] Endpoint POST /api/v4/heartbeat.php — APK envia mac + current_content periodicamente
- [x] Endpoint GET /api/v4/heartbeat.php — APK pode consultar o status atual
- [x] Dashboard: coluna ASSISTINDO atualiza em tempo real via polling

## Ajustes de UI (13/05/2026)
- [ ] Remover item "Trocar DNS em Massa" do menu lateral (AdminLayout)
- [ ] Remover botão de cadastro rápido "Usuário" da tela de Usuários
- [ ] Remover opção "UltraMaster" do select de tipo no cadastro e edição de usuários

## Ajustes UI (14/05/2026)
- [x] Remover botão "Trocar DNS de Todos" da tela de Usuários
- [x] Remover campo "Tipo de Conta" do formulário de cadastro de usuário
- [x] Fixar "App do Cliente" como OuroPro (sem select) no cadastro e edição

## Correções urgentes (16/05/2026)
- [ ] Painel: restaurar aba "Mudar Ícones" no Settings.tsx (com campos padrão se não tiver nada)
- [ ] Painel: restaurar aba "Tela de Bloqueio" no Settings.tsx (com campos padrão)
- [ ] Servidor: corrigir botão de bloqueio no APK (str_lock/lock_url no response do guim.php)
- [ ] Servidor: corrigir botão de atualização de APK (apk_link usando valor configurado)
- [ ] APK mobile v30: restaurar ícones originais do v28, corrigir campo Contact na tela principal
- [ ] APK TV: compilar versão de TV atualizada com nome OuroPro

## APK v31 (16/05/2026)
- [x] Usar APK v29 funcional como base (não o v30 que crasha)
- [x] Corrigir ícone do launcher para cobrir toda a área redonda (adaptive icon) — novo ícone OuroPro dourado gerado
- [x] Compilar e assinar APK v31 — OuroPro_v31_mobile.apk (25MB, versionCode 116, versionName 5.2)

## Correções ícones e bloqueio (17/05/2026)
- [x] Corrigir UPLOAD_FIELD_KEYS no apiRoutes.ts para aceitar icon_reload_url, icon_exit_url, icon_settings_url, icon_live_tv_url, icon_movies_url, icon_series_url, icon_account_url, icon_change_playlist_url
- [x] Adicionar ícones faltantes: account e change_playlist na aba Ícones do Settings.tsx
- [x] Remover aba "Tela de Bloqueio" do Settings.tsx (grid agora 5 colunas)
- [x] Mover campos de mensagem de bloqueio (título, mensagem, botão) para aba Banner

## Correções ícones dinâmicos (17/05/2026 - v2)
- [x] Gerar 8 ícones dourados padrão OuroPro (live_tv, movies, series, account, change_playlist, settings, reload, exit)
- [x] Upload dos ícones para storage do webdev
- [x] Corrigir ICON_DEFAULTS no servidor para todos os 8 ícones com URLs corretas
- [x] Corrigir ICON_SETTING_KEYS para incluir settings, reload e exit
- [x] Todos endpoints /api/v4/icon/:name retornam HTTP 200 com ícone dourado padrão
- [x] Confirmado: APK chama /api/v4/icon/settings, /reload, /exit, /account, /change_playlist, /series, /movies, /live_tv
- [x] Confirmado: apk_link vem do guim.php (campo apk_download_url no painel → aba APK)

## Melhorias painel (17/05/2026 - v3)
- [ ] Tema: adicionar campo de cor do texto (letras) além da cor de fundo
- [ ] Usuários: ao clicar em editar, formulário já vem preenchido automaticamente sem precisar selecionar campos
- [ ] Seleção visual: destacar item selecionado (faixa branca com texto preto) em listas/selects do painel

## Novas funcionalidades (18/05/2026)
- [x] Loja: campo apk_short_url (link encurtado) com toggle para usar link encurtado ou link completo
- [x] Ao deletar revenda/master: bloquear imediatamente todos os usuários vinculados no banco (cascata: sub-revendas + devices)
- [x] Modal de bloqueio para revenda/master deletado: exibir mensagem de pagamento expirado ao tentar acessar o painel deles
- [x] Aviso automático 3 dias antes do vencimento da revenda via chatbot/WhatsApp (filtro: apenas Revenda/Master/Ultra Master)
- [x] Botão "Cadastrar DNS" na página de DNS do painel
- [x] Troca de DNS em massa: trocar somente o host/DNS (não a URL completa) dos usuários vinculados à DNS selecionada

## Novas funcionalidades (20/05/2026)
- [ ] Revendas: botão Bloquear/Desbloquear revenda (sem excluir) com bloqueio cascata de devices
- [ ] Configurações: corrigir botão "Atualizar Aplicativo" (endpoint /api/v4/update.php retornando link correto)
- [ ] Heartbeat: investigar e corrigir exibição do canal assistido no painel (coluna ASSISTINDO)

## Novas funcionalidades (21/05/2026)
- [ ] Perfil: seção de alterar senha e alterar login (email)
- [ ] DNS: botão excluir DNS cadastradas na página DNS
- [ ] Revendas: painel de revendas ativas com contagem de clientes por revenda
- [ ] Configurações APK: corrigir botão Atualizar Aplicativo (apk_link no guim.php)

## Novas funcionalidades (26/05/2026)
- [ ] Corrigir "Assistindo" — heartbeat periódico a cada 30s no APK para manter canal fixo enquanto app aberto
- [ ] Corrigir "Assistindo" — limpar currentContent ao fechar o app (onDestroy envia heartbeat com content vazio)
- [ ] Ocultar aba "Configurações do App" no painel para planos Master e Revenda
- [ ] Informar sobre desenvolvimento de apps para Roku, LG (webOS), Samsung (Tizen), TCL (Android TV)

## Correções (27/05/2026)
- [ ] Corrigir download APK na Loja (link /apk retornando erro)
- [ ] Link encurtado: trocar texto longo por URL curta (ex: renciaapp.manus.space/apk)
- [ ] Heartbeat periódico no APK: enviar a cada 30s enquanto assistindo (não apagar ao não mudar de canal)
- [ ] Ocultar aba "Configurações do App" no painel para planos Revenda e Master
- [ ] APK v33: compilar com heartbeat periódico
- [ ] Explicar e preparar APKs para TVs (Roku, LG webOS, Samsung Tizen, TCL Android TV)

## Bug crítico (02/06/2026)
- [x] Corrigir React Error #310 ao atualizar a página do painel (hooks chamados em ordem inválida)

## Carousel e Endpoints APK (13/06/2026)
- [x] Schema: tabela carousel_slides e carousel_config
- [x] Procedure: CRUD de slides do carousel (listar, criar, editar, deletar, reordenar)
- [x] Procedure: configuração do carousel (auto-play, intervalo)
- [x] Frontend: página CarouselManager com gerenciamento completo
- [x] Frontend: botão "Carousel do App" no menu lateral (AdminLayout)
- [x] Corrigir buildWords() para enviar TODOS os campos do WordModels (tv_mac_expired, open_website, str_continue, ok, cancel, etc)
- [x] Enviar objeto words COMPLETO nos endpoints /api/guim.php (não apenas parcial)
- [ ] Tela de bloqueio: botão "Renovar Agora" abrindo WhatsApp
- [ ] Tela home: frases do painel aparecendo corretamente no app

## Correções APK v34 (13/06/2026)
- [ ] Remover/ocultar texto "Sua assinatura expirou" na home quando o MAC NÃO está expirado
- [ ] Corrigir botão URL do site (não funciona no app)
- [ ] Corrigir botão WhatsApp do suporte (não funciona no app)
- [ ] Corrigir botão Telefone/Contato na tela home (não funciona no app)
- [ ] Corrigir botão URL de renovação na tela de bloqueio (não funciona no app)

## Novas Funcionalidades (14/06/2026)
- [x] Gerar assets com ícone OuroPro para Samsung, LG, Roku e TCL
- [x] Corrigir carousel de slides - upload de imagens/vídeos com tempo configurável
- [x] Criar sistema de Sugestões - formulário para master/revenda com nome, telefone, etc
- [x] Criar sistema de Avisos - ultra master escreve avisos que aparecem na abertura
- [x] Implementar logout automático diário - pedir login/senha ao entrar em novo dia


## Melhorias Solicitadas (16/06/2026)
- [x] Adicionar tema claro/escuro com botão de toggle
- [x] Adicionar menu hambúrguer (3 traços) nas páginas de Sugestões e Avisos
- [x] Corrigir upload de carousel - suportar múltiplas imagens e URL válida
- [x] Implementar modal de avisos na abertura do painel
- [x] Usar logo OuroPro fornecido e melhorar design geral
- [x] Melhorar design do painel com mais fluidez
