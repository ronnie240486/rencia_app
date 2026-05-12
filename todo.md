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

## Pendências críticas (09/05/2026)
- [x] Renomear "Ouro Revenda" → "OuroPro" em todo o painel (título, sidebar, textos)
- [x] Settings.tsx: adicionar componente AppUpdateTab (botão de atualização do APK)
- [x] Settings.tsx: adicionar componente ChatbotTab (envio de mensagem WhatsApp para clientes)
- [x] Corrigir conexão painel-APK: background não muda mais quando salvo no painel (content-type detectado por magic bytes)
- [x] Corrigir conexão painel-APK: ícones dos botões agora carregados via Glide do servidor
- [ ] Corrigir conexão painel-APK: frases de impacto/contato não aparecem no APK
- [ ] Hierarquia de planos: dono (OuroPro Master) sem limites, Ultra Master com limites maiores, Revenda com limites menores
- [x] APK: texto disclaimer adicionado na tela de bloqueio
- [x] APK: ícones reload, exit, configurações personalizáveis pelo painel (via /api/v4/icon/:name)
- [ ] Chatbot: ao cadastrar telefone do cliente, chatbot envia mensagem WhatsApp direto pelo painel
- [ ] Planilha de custos: ativações de DNS + custo servidor + clientes de outros serviços (implementar depois)

## Pendências (11/05/2026)
- [x] Settings: opção "sem logo" (toggle para ocultar logo no APK)
- [x] Settings: ícones de reload, exit e configurações configuráveis no painel
- [x] Renomear completamente "Ouro Revenda" → "OuroPro" em todos os arquivos do painel
- [x] ChatbotTab: buscar telefone real do cliente via procedure tipada (trpc.chatbot.clients)
- [x] APK smali: buscar ícones dinâmicos do servidor via proxy (loadIconsFromServer via Glide)
- [x] APK smali: frases de impacto e contato via guim.php (languages/words)
- [x] APK smali: texto disclaimer na tela de bloqueio (fragment_description.xml)
- [x] APK v29 recompilado e assinado (com crash fix + disclaimer + ícones dinâmicos)

## Bugs críticos (12/05/2026)
- [x] APK v29 crash corrigido (null-check antes de check-cast nos ImageViews do initView)
- [x] Textos de disclaimer adicionados na tela de bloqueio (fragment_description.xml)

## Novas features (11/05/2026 - v2)
- [x] Paleta de cores para trocar cor dos botões do painel (primary color picker nas configurações)
- [x] Campo telefone (+55 pré-fixado) no cadastro de usuário
- [x] Chatbot puxar telefone do cliente cadastrado (não só do dono)
- [ ] Corrigir crash APK v29 (fechar ao abrir)
- [x] Sidebar logo: upload pelo painel + fallback texto OuroPro
- [x] Cor dos botões do painel: laranja → dourado correto

## Novas features (12/05/2026 - v3)
- [x] APK v30: corrigir crash SettingActivity (parseDouble sem null-check)
- [x] Painel Usuários Online: mostrar canal/série/filme que está assistindo
- [x] Painel Usuários Online: mostrar tempo online (quanto tempo está conectado)
- [x] Painel Usuários Online: mostrar dispositivo (TV/Mobile)
- [x] APK: enviar heartbeat com canal/série/filme atual para o painel (endpoint criado, APK v31 necessário)
