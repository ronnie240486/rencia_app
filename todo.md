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
