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
