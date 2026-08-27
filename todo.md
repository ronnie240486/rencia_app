# Rencia App - TODO
# Atualização Ultra Player: uploads visuais, Loja e Ranking registrados abaixo como pendentes prioritários.

## Acesso de APK por Login e Senha
- [x] Criar credenciais seguras de aplicativo vinculadas aos clientes, listas, validade e status existentes
- [x] Criar rota pública de login do APK com resposta de configuração, imagens, mensagens e listas
- [x] Permitir vincular o MAC informado pelo APK no primeiro login sem remover o modo MAC atual
- [x] Criar gerenciamento visual de credenciais de aplicativo no painel
- [x] Cobrir o novo fluxo com testes automatizados e validar TypeScript antes do checkpoint
- [x] Adicionar testes das operações de criação, listagem, edição e remoção de credenciais no painel

## Credenciais Reais do Painel IPTV
- [x] Usar obrigatoriamente o usuário e a senha XTeam da Lista Principal como acesso do APK
- [x] Remover os campos de login e senha criados manualmente do cadastro por credenciais
- [x] Retornar a DNS/XTeam original e a lista correspondente ao login real do painel IPTV
- [x] Atualizar a gestão e os testes para o fluxo sem credenciais inventadas
- [x] Remover a alteração manual de senha do backend de credenciais de aplicativo
- [x] Invalidar credenciais antigas sem DNS XTeam para que não autentiquem no APK
- [x] Testar a rejeição de cadastro legado e de redefinição manual de senha

## Entrega de Avisos de Vencimento ao APK
- [x] Rastrear a notificação de vencimento do cliente Max Play até a fila do APK
- [x] Corrigir a entrega de alerta de vencimento quando o cliente estiver com o aplicativo aberto
- [x] Adicionar teste de regressão para envio de vencimento ao dispositivo
- [x] Cobrir a rota GET /api/v5/check_mac.php com payload de vencimento do Max Play
- [x] Documentar que o Max Play deve consultar a rota de configuração periodicamente enquanto estiver aberto
- [x] Criar guia consumível para o desenvolvedor do Max Play com polling e campos de vencimento
- [ ] Confirmar a rota efetivamente consultada pelo Maximum Player no aparelho aberto
- [ ] Entregar o aviso de vencimento também no formato compatível com essa rota
- [ ] Validar em teste a resposta da rota real usada pelo Maximum Player
- [ ] Rastrear a consulta do MAC 6A:55:E2:DB:C3:4A após a abertura do Maximum Player
- [ ] Adicionar um contrato alternativo de aviso compatível se o Maximum Player não lê expiration_*

## Login de Revenda
- [x] Verificar a senha gravada e o status da conta testeu163@gmail.com
- [x] Corrigir a atualização de senha de revendas no painel, se necessário
- [x] Adicionar teste de regressão para troca e autenticação de senha de revenda
- [x] Redefinir diretamente a senha da conta ativa testeu163@gmail.com e confirmar o login publicado
- [x] Remover o e-mail duplicado da conta legada bloqueada para eliminar conflito de autenticação
- [x] Validar o login da revenda pela mesma interface usada no painel
- [x] Corrigir e testar a atualização de senha de revenda no fluxo do painel, sem ajuste manual no banco
- [x] Cobrir de forma integrada a alteração de senha da revenda seguida do login no Portal da Revenda
- [x] Criar um acesso de revenda separado da tela Manus, mantendo o painel principal privado
- [x] Garantir que apenas o proprietário possa abrir o Painel Principal e suas configurações administrativas
- [x] Expor para cada revenda somente os próprios clientes, listas e dados permitidos
- [x] Publicar e validar as rotas do portal de revendas no domínio real
- [x] Cobrir login, sessão inválida e filtro de clientes com teste HTTP do portal
- [x] Impedir explicitamente que uma sessão de revenda abra rotas do Painel Principal
- [x] Adaptar a leitura de sessão e clientes do portal para o método HTTP aceito no domínio publicado
- [x] Validar visualmente a página pública do Portal da Revenda com login real e lista carregada
- [x] Registrar e entregar a URL pública final do Portal da Revenda
- [ ] Confirmar e corrigir a abertura do link público do Portal da Revenda no dispositivo do usuário
- [ ] Permitir que a revenda cadastre clientes próprios pelo portal
- [ ] Permitir editar, bloquear, liberar e excluir somente os próprios clientes
- [ ] Permitir que a revenda cadastre e altere as listas dos próprios clientes
- [ ] Adicionar interface móvel operacional com ações claras para clientes e listas
- [ ] Cobrir as novas operações do portal com testes de isolamento por revenda
- [ ] Disponibilizar à revenda o painel completo de usuários, listas, DNS, avisos, financeiro, relatórios e manutenção
- [ ] Ocultar configurações de aplicativos, loja global, backups globais, permissões e demais ferramentas exclusivas do proprietário
- [ ] Garantir que cada ferramenta completa do painel filtre e altere somente os dados da revenda autenticada
- [x] Permitir login local de revendas no mesmo painel principal, sem tela Manus
- [x] Manter a mesma interface e navegação principal para revenda, ocultando somente itens exclusivos do proprietário
- [x] Redirecionar a revenda autenticada ao Dashboard do painel compartilhado com seus próprios dados
- [x] Liberar a URL do painel para acesso público somente até o login local autorizado pelo proprietário
- [x] Confirmar que login público não concede edição do projeto nem permissões administrativas do proprietário
- [x] Validar no domínio real uma revenda entrando por e-mail e senha no mesmo Dashboard do painel
- [x] Validar visualmente que a revenda vê a navegação operacional e não vê itens exclusivos do proprietário
- [x] Cobrir todas as rotas ownerOnly relevantes para impedir acesso manual de revendas
- [x] Documentar que a URL pública expõe apenas a aplicação e não concede edição do projeto Manus
- [x] Verificar a conta ativa e a senha efetivamente usada pelo login público da revenda
- [x] Corrigir a rejeição de senha no mesmo painel público e validar em sessão limpa
- [x] Garantir que a senha salva em Revendas atualize o mesmo passwordHash consultado pelo login público
- [x] Adicionar teste completo de alterar senha em Revendas e entrar no painel público com a nova senha
- [x] Adicionar teste integrado de alteração em Revendas seguida de loginLocal no mesmo painel público
- [x] Sincronizar ou remover o fluxo legado localCredentials para evitar divergência futura de senha
- [x] Reproduzir o ciclo real de excluir e recriar a revenda com o mesmo e-mail e senha
- [x] Garantir que recriação não deixe credencial, sessão ou e-mail antigo interferindo no login
- [x] Corrigir a recriação de revenda para gravar automaticamente a senha informada no passwordHash do login público
- [x] Adicionar integração de excluir, recriar com mesmo e-mail e entrar no mesmo painel sem SQL manual
- [x] Limpar ou sincronizar credenciais legadas e seleção de conta na recriação de revenda
- [ ] Limpar localCredentials da revenda ao excluir a conta
- [ ] Testar excluir, recriar com o mesmo e-mail e entrar no mesmo painel sem SQL manual
- [ ] Validar o ciclo completo em rota publicada antes de concluir a entrega
- [ ] Rastrear o login publicado da conta recém-recriada testeu163@gmail.com sem supor a senha usada
- [ ] Corrigir a falha real de autenticação dessa conta e validar o Dashboard publicado
- [x] Impedir que o navegador trate o campo de senha da revenda como criação de senha do próprio navegador
- [x] Exibir instrução de login no painel sem acionar confirmação de senha externa
- [ ] Auditar e documentar as ferramentas que permanecem exclusivas do proprietário em relação a Master e Revenda
- [x] Criar permissões individuais por Master e Revenda para liberar ferramentas escolhidas pelo proprietário
- [x] Adicionar botão de Permissões no cadastro e edição de Revendas
- [x] Ocultar e bloquear cada ferramenta não autorizada para a conta selecionada
- [x] Cobrir no catálogo todas as rotas exclusivas que ainda não possuem permissão individual
- [x] Exibir o acesso de Permissões também dentro do fluxo de edição da Revenda
- [x] Aplicar e testar autorização individual nas procedures sensíveis do backend
- [x] Testar que toda rota exclusiva possui uma permissão correspondente no catálogo
- [ ] Validar no navegador edição de revenda, abertura de permissões e gravação de uma liberação
- [ ] Estender a autorização individual às demais procedures globais liberáveis
- [x] Mostrar o resumo de falhas de listas somente uma vez por dia para cada usuário
- [x] Destacar permissões selecionadas com preto no tema claro e branco no tema escuro
- [x] Reativar a conta existente flemingfleming10fleming@gmail.com e vinculá-la como revenda
- [ ] Confirmar a presença de flemingfleming10fleming@gmail.com na lista de Revendas da sessão do proprietário
- [x] Remover o registro antigo do MAC C4:4E:AC:0A:65:85 e preservar o cadastro ativo da Testeu
- [x] Remover por completo todos os registros de um cliente ou MAC ao excluir o cadastro
- [ ] Permitir recadastrar o mesmo MAC em outra conta sem usar registros antigos
- [ ] Validar se existem referências históricas identificadas pelo MAC além do deviceId
- [ ] Testar exclusão e recadastro do mesmo MAC em outra conta sem qualquer conflito
- [x] Remover todos os cadastros duplicados do mesmo MAC em outras contas quando o MAC for excluído
- [x] Simular falha confirmada da Lista 1 e comprovar a ativação da Lista 2 no estado do dispositivo
- [x] Simular recuperação confirmada da Lista 1 e comprovar retorno ao estado principal
- [x] Validar os payloads `backup_active` e `primary_restored` devolvidos ao aplicativo
- [ ] Verificar se o Ouro Pro em uso chama a rota de falha de reprodução ao ocorrer erro
- [ ] Entregar ao desenvolvedor do Ouro Pro o contrato de troca imediata e sincronização de listas
- [ ] Garantir que o Ouro Pro substitua a fonte de playlist pela Lista 2 após receber o failover
- [x] Medir o tempo de resposta do painel ao entregar a configuração de uma lista reativada
- [ ] Comparar o tempo total percebido no Ouro Pro com a resposta do painel em uma lista reativada
- [ ] Coletar o log do Ouro Pro após receber a configuração para localizar parse, cache ou reload lento
- [x] Atualizar o download e a URL de atualização do Ouro Pro para o novo APK enviado
- [x] Atualizar o Ouro Pro com Downloader 3386441 e link AFTV aftv.news/3386441
- [ ] Validar no painel publicado a abertura do controle de Permissões de uma revenda
- [ ] Validar visualmente o contraste da seleção nos temas claro e escuro
- [x] Confirmar a senha persistida durante a criação antes de informar que a nova revenda está pronta
- [x] Limpar credenciais legadas antes de excluir o cadastro de revenda

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
- [x] Endpoint GET /api/v5/heartbeat — Novo endpoint para registrar heartbeat do dispositivo (23/07/2026)
- [x] Dispositivo com MAC 0C:49:70:13:28:86 aparecendo como "online" no dashboard (23/07/2026)

## Testes e Validação (23/07/2026)
- [x] Criar testes vitest para protocolo Xtream Codes (server/xtreamcodes.test.ts)
- [x] Validar autenticação com MAC address
- [x] Validar retorno de categorias em JSON
- [x] Validar retorno de streams com URLs HTTPS
- [x] Validar heartbeat do dispositivo
- [x] Validar segurança (sem exposição de senhas)
- [x] Todos os 30 testes passando
- [x] Criar documento de compatibilidade APK (APK_COMPATIBILITY_TEST.md)

## Ajustes de UI (13/05/2026)
- [x] Remover item "Trocar DNS em Massa" do menu lateral (AdminLayout) — Verificar se ainda existe
- [x] Remover botão de cadastro rápido "Usuário" da tela de Usuários — Verificar se ainda existe
- [x] Remover opção "UltraMaster" do select de tipo no cadastro e edição de usuários — Verificar se ainda existe

## Ajustes UI (14/05/2026)
- [x] Remover botão "Trocar DNS de Todos" da tela de Usuários
- [x] Remover campo "Tipo de Conta" do formulário de cadastro de usuário
- [x] Fixar "App do Cliente" como OuroPro (sem select) no cadastro e edição

## Correções urgentes (16/05/2026)
- [x] Painel: restaurar aba "Mudar Ícones" no Settings.tsx (com campos padrão se não tiver nada)
- [x] Painel: restaurar aba "Tela de Bloqueio" no Settings.tsx (com campos padrão)
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
- [ ] Criar sistema de Sugestões - formulário para master/revenda com nome, telefone, etc
- [ ] Criar sistema de Avisos - ultra master escreve avisos que aparecem na abertura
- [x] Implementar logout automático diário - pedir login/senha ao entrar em novo dia


## Melhorias Solicitadas (16/06/2026)
- [x] Adicionar tema claro/escuro com botão de toggle
- [x] Adicionar menu hambúrguer (3 traços) nas páginas de Sugestões e Avisos
- [x] Corrigir upload de carousel - suportar múltiplas imagens e URL válida
- [x] Implementar modal de avisos na abertura do painel
- [x] Usar logo OuroPro fornecido e melhorar design geral
- [x] Melhorar design do painel com mais fluidez

## Reorganização de Menu (30/06/2026)
- [x] Separar "OuroPro" (Banner + Ícones) em /settings
- [x] Criar novo item "Configurações do App" (Painel + Tema + Chatbot + APK) em /app-settings
- [x] Adicionar rota /app-settings no App.tsx
- [x] Adicionar item "Configurações do App" no menu lateral (AdminLayout)

## Correcoes APK/Expo Go (23/07/2026 - v2)
- [x] Cadastrar dispositivo Interactive Player (MAC: 2F:97:6F:BF:8A:00)
- [x] Criar credenciais para Interactive Player
- [x] Adicionar middleware global de CORS para permitir requisicoes de qualquer origem
- [x] Validar headers CORS no endpoint /player_api.php
- [x] Endpoint /player_api.php retornando categorias e streams corretamente
- [x] Interactive Player carregando canais (removida convertUrlsInObject que estava transformando URLs)
- [x] Auto-registro de MAC addresses no /player_api.php (device registrado automaticamente quando credencial válida é usada)
- [x] Correção de 'online' no dashboard (device vinculado ao ownerId da credencial usada)


## Renomeacao GPCPRO → Maximus (24/07/2026)
- [x] Mudar nome de "GPCPRO" para "Maximus" no menu lateral
- [x] Mudar nome de "GPCPRO" para "Maximus" em todos os endpoints /api/v5
- [x] Mudar nome de "GPCPRO" para "Maximus" em todas as paginas do frontend
- [x] Adicionar endpoints maximus.getSettings e maximus.updateSettings no backend
- [x] Criar pagina SettingsMaximus.tsx com tela de configuracoes
- [ ] Modificar APK Maximus player para chamar endpoints de configuracoes
- [ ] Adicionar endpoints /api/v5/maximus/* para o APK buscar configuracoes
- [ ] Compilar e assinar novo APK Maximus com suporte a configuracoes


## Melhorias UI/UX (28/07/2026)
- [x] UserEdit.tsx: campo "APP DO CLIENTE" agora é um dropdown com opções OuroPro e Maximus Player
- [x] Contabilizar no ranking os apps escolhidos no cadastro de usuário
- [x] RankingApps.tsx: redesenhar página com visual mais bonito e atrativo (cards, badges, animações)
- [x] RankingApps.tsx: mostrar estatísticas de adoção de cada app (porcentagem, gráfico)
- [x] Backend: criar endpoint para contar quantos dispositivos usam cada app
- [x] Backend: atualizar ranking em tempo real quando um app é selecionado no cadastro
- [x] Testes vitest para validar contabilização de apps no ranking


## Autenticação com Email/Senha (30/07/2026)
- [ ] Preparar banco de dados - adicionar colunas passwordHash e senhaRevenda
- [ ] Implementar bcrypt para hash de senha
- [ ] Criar endpoints de login/logout com email/senha
- [ ] Criar página de login com email/senha
- [ ] Adicionar campo de senha ao criar usuários (Revenda, Master, Admin)
- [ ] Remover autenticação Manus OAuth do código
- [ ] Criar conta de master: ronnie240486@gmail.com / Ronnie_alle240486@
- [ ] Testar fluxo completo de autenticação

## Cor dinâmica do botão "Adicionar Lista" (30/07/2026)
- [x] Adicionar coluna buttonAddListColor à tabela nuvixConfig
- [x] Criar campo de cor no NuvixConfig.tsx
- [x] Adicionar suporte no AdminLayout.tsx para aplicar cor via CSS variable
- [x] Adicionar variável CSS --btn-add-list-color no index.css
- [x] Atualizar DeviceLists.tsx para usar a variável CSS
- [x] Adicionar campo panel_add_list_color em Settings.tsx

## Correção de Segurança - Login (30/07/2026)
- [x] Adicionar validação de isActive no loginLocal
- [x] Garantir que usuários deletados não conseguem fazer login
- [x] Criar teste vitest para validar segurança do login
- [x] Validar que usuários inativos são rejeitados

## Correções urgentes de vencimento e dados (11/08/2026)
- [x] Corrigir deslocamento de data: data escolhida no calendário deve ser salva e exibida no mesmo dia
- [x] Criar verificação automática apenas quando faltar exatamente 1 dia para a expiração do usuário
- [x] Executar a verificação ao criar e editar usuários já cadastrados
- [ ] Integrar envio real e automático de WhatsApp, sem abrir links ou exigir cliques manuais
- [ ] Atualizar imediatamente no painel a data e as listas recém-salvas
- [x] Corrigir gravação da data escolhida: 13/08 deve permanecer 13/08 no banco, formulário e tabela
- [x] Fazer o Chatbot registrar automaticamente o aviso interno, sem depender de "Verificar Agora" ou de links do WhatsApp
- [ ] Enviar automaticamente o aviso de vencimento ao telefone cadastrado do cliente
- [ ] Integrar WhatsApp Business para entrega automática do aviso ao telefone cadastrado
- [x] Botão "Verificar Agora" do Chatbot: texto branco e legível no tema escuro
- [x] Chatbot: botão "Enviar para Todos" para preparar avisos em massa sem abrir cada cliente individualmente

## Pacote Super Painel
- [x] Criar Central de Alertas com vencimentos, dispositivos offline, listas com erro e clientes sem telefone
- [x] Criar Histórico de Ações com data, hora, usuário e alteração realizada
- [x] Criar Diagnóstico de Conexão por dispositivo
- [x] Criar Controle de Pagamentos por cliente
- [x] Criar Monitor de Disponibilidade das Listas

## Auditoria e Navegação do Painel
- [x] Auditar as funções existentes para não duplicar recursos já implementados
- [x] Corrigir a barra lateral para permitir rolagem até a última função em telas pequenas e grandes
- [x] Organizar a lista de próximas funções apenas com lacunas ainda não implementadas

## Bloqueio e Configuração em Massa
- [x] Criar bloqueio e liberação individual de cliente sem apagar dados
- [x] Criar bloqueio e liberação em massa dos clientes selecionados
- [x] Criar configuração em massa de status, vencimento, aplicativo e lista/DNS

## Revendas Funcionais
- [x] Garantir que a criação de revenda gere conta com acesso isolado e senha inicial
- [x] Bloquear revenda de forma efetiva no login e no acesso aos próprios clientes
- [x] Aplicar limite de dispositivos da revenda ao cadastrar clientes
- [x] Exibir uso e limite de dispositivos no painel da revenda

## Correção Crítica de Revendas
- [x] Corrigir avisos de vencimento para aparecerem somente na revenda dona do cliente
- [x] Impedir acesso imediato da revenda bloqueada em todas as sessões existentes
- [x] Corrigir limite de dispositivos configurado para não voltar para 999
- [x] Reproduzir e corrigir acesso persistente da revenda bloqueada testeu163@gmail.com
- [x] Corrigir limite 999 exibido para testeu163@gmail.com apesar do limite 50 cadastrado
- [x] Permitir salvar edição de revenda sem alterar a senha

## Atendimento por Cliente
- [ ] Pulado: cliente final não acessa o painel

## Relatórios Financeiros
- [x] Criar indicadores de receita recebida, pendências e atrasos
- [x] Criar filtro de período para os relatórios
- [x] Criar tela de relatório financeiro para proprietário e revendas

## Modelos de Mensagens
- [x] Criar modelos salvos de renovação, cobrança, boas-vindas e manutenção
- [x] Permitir criar, editar e remover modelos do Chatbot
- [x] Permitir aplicar um modelo à mensagem do Chatbot

## Controle de Sessões
- [x] Criar painel de sessões recentes por MAC e dispositivo
- [x] Identificar tentativas simultâneas ou suspeitas no mesmo MAC
- [x] Permitir bloquear o dispositivo suspeito diretamente pelo painel

## Relatório de Revendas
- [x] Consolidar clientes, dispositivos e limites por revenda
- [x] Consolidar vencimentos e pagamentos por revenda
- [x] Criar tela de acompanhamento geral das revendas para o proprietário

## Agenda de Renovação
- [x] Criar lista de vencimentos para hoje, amanhã e próximos dias
- [x] Criar filtros por período e status do cliente
- [x] Preparar avisos em massa para os clientes selecionados

## Central de Manutenção
- [x] Consolidar falhas recentes de listas em uma única tela
- [x] Mostrar dispositivos offline e bloqueados que exigem atenção
- [x] Priorizar ações de manutenção por nível de risco

## Painel de Atualizações do APK
- [x] Consolidar clientes por aplicativo e versão em uso
- [x] Identificar clientes com versão inferior à versão configurada
- [x] Preparar avisos em massa para clientes desatualizados

## Ficha 360° do Cliente
- [x] Consolidar dados de dispositivo, listas, vencimento e pagamentos por cliente
- [x] Exibir sessões recentes e histórico de ações do cliente
- [x] Criar ações rápidas de bloqueio, liberação e edição a partir da ficha

## Exportação de Relatórios
- [x] Exportar relatório de pagamentos filtrado em CSV
- [x] Exportar agenda de vencimentos filtrada em CSV
- [x] Exportar relatório consolidado de revendas em CSV
- [x] Exportar lista de clientes filtrada em CSV

## Backup Automático
- [x] Criar histórico de backups automáticos com cópias datadas
- [x] Armazenar backups completos de forma segura fora do banco principal
- [x] Ativar cópia diária às 03:00 e registrar cada execução após a publicação
- [x] Criar tela para consultar e restaurar backup com confirmação

## Próximo Pacote do Super Painel
- [x] Criar Busca Global por cliente, MAC, telefone, lista e revenda
- [x] Criar Central de Segurança com logins, alterações de senha e bloqueios
- [x] Criar cobrança recorrente para revendas com vencimento e status de pagamento

## Pacote Operacional Avançado
- [x] Criar etiquetas personalizadas para organizar clientes por situação
- [x] Criar observações internas por cliente com histórico operacional
- [x] Permitir anexar referência de comprovante às cobranças de clientes
- [x] Criar fila de manutenção com status, prioridade e responsável
- [x] Criar notificações internas para alertas operacionais importantes
- [x] Formalizar permissões operacionais entre proprietário, master e revenda
- [x] Criar prévia de importação com detecção de MACs duplicados e alterações

## Ativação de Backup Diário
- [x] Publicar e ativar a rotina automática diária de backup às 03:00
- [x] Confirmar que a rotina agendada registra a execução no Centro de Backups

## Retenção de Históricos
- [x] Apagar automaticamente históricos operacionais após três dias
- [x] Adicionar lixeira individual e limpeza total para Histórico de Ações
- [x] Adicionar lixeira individual e limpeza total para Alertas Internos
- [x] Adicionar lixeira individual e limpeza total para fila de Manutenção concluída/cancelada
- [x] Completar lixeira em todas as demais telas que exibem histórico operacional
- [x] Corrigir visibilidade das lixeiras na Central de Manutenção e demais telas publicadas

## Central Avançada de Listas
- [x] Monitorar automaticamente a disponibilidade e o tempo de resposta das listas
- [x] Trocar automaticamente da Lista 1 para Lista 2 ou Lista 3 quando a principal falhar
- [x] Executar o monitoramento automático de listas a cada 10 minutos
- [x] Avaliar e aprovar uma evolução estratégica de backend para aumentar resiliência e segurança das listas
- [x] Criar Piloto Automático por Servidor com falha geral confirmada, impacto consolidado e failover seguro
- [x] Posicionar o card do Piloto Automático por Servidor abaixo das listas individuais
- [x] Priorizar Lista 2 e depois Lista 3 quando a lista principal falhar
- [x] Registrar o histórico de falhas e trocas automáticas de lista
- [x] Permitir duplicar uma lista para vários clientes de uma vez
- [x] Criar grupos de DNS e aplicar troca de DNS por grupo
- [x] Definir limite de conexões simultâneas por cliente
- [x] Criar relatório de instabilidade por lista e servidor
- [x] Criar teste de MACs em massa no painel
- [x] Criar aviso de manutenção programada por grupo de clientes e listas
- [x] Exibir aviso de manutenção programada no painel das revendas afetadas

## Estabilidade Avançada de Listas
- [x] Retornar automaticamente à Lista 1 após recuperação estável
- [x] Proteger contra trocas repetidas de lista em instabilidades curtas
- [x] Bloquear temporariamente um servidor para ele não entrar no failover
- [x] Exibir painel de saúde por grupo de DNS
- [x] Programar manutenção com início, término e remoção automática do aviso
- [x] Exibir avisos de manutenção somente entre o início e o término definidos
- [x] Mostrar relatório de impacto antes de troca de DNS ou lista em massa

## Próximas Melhorias Prioritárias
- [x] Exibir impacto de clientes, MACs e revendas antes de aplicar alteração em massa
- [x] Ativar backup completo diário às 03:00 e registrar cada execução

## Clientes Externos e Ultra Player
- [x] Criar gerenciamento de clientes que usam aplicativo externo, preservando MAC e aplicativo atual
- [x] Registrar o aplicativo atual do cliente com opções OuroPro, Maximus, Ultra Player e Outro
- [x] Criar painel de configuração do Ultra Player com banner, ícones, mensagens e API do servidor
- [x] Adicionar upload de logo, fundo, banner e imagens de mensagem do Ultra Player
- [x] Adicionar o Ultra Player à Loja com o ícone enviado
- [x] Adicionar Ultra Player à seleção de listas e aos indicadores do Ranking
- [x] Criar endpoints de configuração do Ultra Player para consumo pelo APK
- [x] Preparar especificação técnica de integração para o desenvolvedor do Ultra Player

## Ajustes Ultra Player — uploads e ícones
- [x] Corrigir o envio de imagens do Ultra Player, que atualmente exibe a mensagem de falha no upload
- [x] Adicionar uploads de ícones personalizáveis para Canais, Filmes e Séries no Ultra Player
- [x] Corrigir a aplicação da imagem de fundo configurada pelo painel no APK Ultra Player
- [x] Confirmar o isolamento das rotas e imagens do Ultra Player em relação ao OuroPro
- [x] Corrigir a rota GET /api/v5/ultra-config que retorna HTTP 500 para o APK

## Entrega ao desenvolvedor do APK
- [x] Preparar texto de integração da rota Ultra Player e dos ícones dinâmicos de Canais, Filmes e Séries

## Ajustes do painel e conteúdo assistido
- [x] Exibir o filtro de período selecionado com texto branco e destaque visível no tema escuro
- [x] Animar o botão de atualizar enquanto a lista de dispositivos conectados é recarregada
- [x] Preservar e atualizar periodicamente o canal, filme ou série assistido quando o conteúdo não muda

## Organização da barra lateral
- [x] Propor e aprovar uma reorganização da sidebar, priorizando Usuários, Cadastro, DNS, OuroPro, Ultra Player e Maximus
- [x] Implementar grupos recolhíveis e a nova ordem de prioridade na sidebar aprovada
- [x] Iniciar todos os grupos da sidebar fechados e abrir somente após toque/clique do usuário

## Fechamento do Super Painel
- [x] Avaliar e aprovar funções finais de alto impacto para reduzir trabalho manual e acelerar a operação diária
- [x] Criar alertas de listas apenas após falha técnica confirmada, sem alertar por falta de uso dos clientes
- [x] Exibir no painel alertas de falha confirmada e recuperação de listas, com impacto e rota de correção

## Próxima melhoria de alto impacto
- [x] Avaliar e aprovar a próxima função operacional para agilizar a gestão diária sem duplicar recursos existentes

## Evolução estratégica do painel
- [x] Avaliar e aprovar uma funcionalidade diferenciada que eleve o painel além de atalhos operacionais

## Central de Comandos Remotos
- [x] Criar fila segura de comandos remotos por aparelho, com expiração, confirmação e histórico
- [x] Criar painel para enviar atualização de lista, troca de lista/DNS, mensagem, reinício e bloqueio/liberação
- [x] Expor endpoints de consulta e confirmação para OuroPro, Ultra Player e Maximus
- [x] Preparar instrução técnica para os APKs executarem e confirmarem comandos remotos

## Loja Pública de Aplicativos
- [x] Propor e aprovar uma página pública de downloads para clientes baixarem OuroPro, Ultra Player e Maximus sem acesso ao painel
- [x] Criar página pública /baixar e links diretos /baixar/ouropro, /baixar/ultra e /baixar/maximus
- [x] Permitir configurar, na Loja privada, os links, versão e disponibilidade dos aplicativos públicos
- [x] Criar URLs curtas e fáceis de compartilhar para cada download público
- [ ] Orientar a adoção de domínio próprio curto sem quebrar as rotas e APIs existentes

## Correções do Monitor e Alertas
- [x] Evitar falso alerta de lista indisponível quando o servidor responder HTTP 403, mas a lista estiver reproduzindo normalmente
- [x] Corrigir o botão de arquivar/marcar como lido para fechar o modal de aviso no primeiro toque
- [x] Não exibir timeout ou lentidão isolada como erro visual enquanto a falha não for confirmada
- [x] Diagnosticar e corrigir o falso erro exibido para a lista mãe do Bruno
- [x] Revalidar servidores lentos por GET parcial antes de classificá-los como indisponíveis

## Resumo de Alertas Técnicos
- [x] Consolidar múltiplas falhas confirmadas em um único modal de resumo na abertura do painel
- [x] Direcionar o resumo para a Central de Alertas sem exigir fechar avisos individuais
- [x] Verificar a causa de o resumo não aparecer quando o usuário abre o painel
- [x] Corrigir o título dos alertas de recuperação para não parecer uma nova falha de lista
- [x] Impedir que o resumo de falhas confirmadas reapareça após cada clique no painel
- [x] Garantir que o modal seja avaliado somente ao entrar no painel, sem reabrir durante cliques comuns

## Notificações de Lista nos Aplicativos
- [x] Preparar a instrução de integração para OuroPro, Ultra Player e Maximus receberem avisos de falha confirmada de lista
- [x] Criar endpoint por MAC para os aplicativos consultarem falhas confirmadas de listas
- [x] Permitir que o aplicativo confirme a leitura de um aviso de falha de lista

## Comunicação de Failover para os APKs
- [x] Informar na resposta do APK quando uma Lista 2 ou Lista 3 estiver ativa automaticamente
- [x] Informar na resposta do APK quando a Lista 1 for restaurada automaticamente
- [x] Instruir o APK a solicitar ao cliente que feche e abra o aplicativo após uma troca de lista

## Troca Silenciosa de Lista nos APKs
- [x] Sinalizar que o APK deve recarregar automaticamente a lista já escolhida pelo painel
- [x] Substituir a orientação de fechar o aplicativo por aviso em tela sobre a lista de reserva ativa
- [x] Informar que a Lista 1 voltará automaticamente após a recuperação do servidor

## Correção de Alerta e Failover Indevidos
- [x] Investigar o aviso de erro da Lista 1 que apareceu mesmo com a lista funcionando
- [x] Remover ou corrigir alertas técnicos indevidos do painel para a lista afetada
- [x] Confirmar que a troca automática só ocorre quando há falha técnica confirmada e lista reserva disponível
- [x] Impedir que mensagens recebidas pelo cliente citem modal, Monitor de Listas ou qualquer ação interna do painel

## Modal de Vencimento nos Aplicativos
- [x] Expor a data de vencimento cadastrada no painel para o APK do cliente
- [x] Informar se o vencimento está próximo, vence hoje ou já venceu
- [x] Preparar texto de modal simples para renovação sem referências internas ao painel

## Correção de Acionamento do Failover
- [x] Investigar a Lista 1 que parou sem ativar a Lista 2 nem mostrar aviso no APK
- [x] Corrigir a condição que impede a troca automática quando houver Lista 2 válida
- [x] Confirmar que o APK recebe o sinal de troca após o failover confirmado
- [x] Corrigir o caso de Ronnie celular, cuja Lista 1 parou sem trocar para a Lista 2 nem avisar o aplicativo
- [x] Impedir que uma resposta HTTP 403 protegida restaure a Lista 1 sem confirmação real de funcionamento

## Troca Imediata Durante Reprodução
- [x] Criar uma rota para o APK reportar que a reprodução da lista ativa parou
- [x] Ativar a próxima lista válida imediatamente após o reporte do APK
- [x] Atualizar a sessão do aplicativo em segundo plano e mostrar aviso simples ao cliente
- [x] Remover o import obsoleto que bloqueia a checagem de tipos do aplicativo

## Correção de Persistência do MAC
- [x] Investigar por que o MAC editado volta ao valor anterior após o primeiro salvamento
- [x] Garantir que a edição do MAC salve corretamente na primeira tentativa
- [x] Atualizar a lista e o formulário com o MAC novo logo após salvar

## Persistência Imediata em Todo o Painel
- [x] Mapear os formulários de edição de usuários, listas, DNS e configurações
- [x] Impedir que dados carregados tardiamente sobrescrevam alterações já digitadas
- [x] Atualizar o cache e as listas visíveis logo após cada salvamento
- [x] Testar alterações de usuário, lista, DNS e configurações na primeira tentativa
- [x] Substituir o salvamento simulado do Maximus por gravação real no painel

## Desempenho de Carregamento do APK
- [x] Medir o tempo das rotas usadas para carregar cards, configurações e playlists no aplicativo
- [x] Identificar se algum endpoint do painel está atrasando a abertura do aplicativo
- [x] Corrigir gargalos encontrados e validar o carregamento após a melhoria

## Restauração de Avisos nos Aplicativos
- [ ] Verificar a rota por MAC que entrega avisos de vencimento e de listas ao APK
- [ ] Restaurar os avisos de vencimento e falha de lista sem alterar playlists cadastradas
- [ ] Validar o texto de modal recebido pelo aplicativo do cliente

## Avisos de Vencimento no Painel
- [x] Verificar por que os alertas de vencimento não aparecem na tela do backend
- [x] Restaurar a geração e a exibição de avisos para o responsável pelo cliente
- [x] Validar os avisos de cliente que vence amanhã, vence hoje e vencido
- [x] Exibir um novo aviso mesmo quando o administrador já fechou outro modal no mesmo dia
- [x] Atualizar automaticamente a consulta de avisos enquanto o painel estiver aberto
- [x] Alinhar as colunas de avisos no banco para permitir criar novos alertas

## Instrução para Desenvolvedores dos APKs
- [x] Preparar uma mensagem unificada de integração de vencimento, falhas de lista e troca automática

## Conteúdo Assistido no Ultra Player
- [x] Confirmar a rota e os campos para o Ultra Player informar canal, filme ou série em reprodução
- [x] Entregar o formato da requisição para celular e TV

## PDF para Desenvolvedor do Ultra Player
- [x] Gerar PDF com a rota de conteúdo assistido para celular e TV

## URL Unificada de Atualização dos Aplicativos
- [x] Mapear os campos e as rotas de atualização próprios de OuroPro, Ultra Player e Maximus
- [x] Criar respostas isoladas de atualização, cada uma retornando somente a URL do respectivo aplicativo
- [x] Documentar os endpoints separados de atualização para os três aplicativos
- [x] Manter a URL existente do OuroPro e adicionar um campo próprio de URL no Ultra Player e no Maximus

## Organização da URL do OuroPro
- [x] Mover a URL e a versão de atualização do OuroPro para a tela de configurações do OuroPro
- [x] Remover esses campos da aba Configurações do App sem alterar a configuração já salva

## Atualização da Tela Publicada
- [ ] Verificar por que a sessão do celular ainda mostra a aba APK antiga
- [ ] Confirmar o carregamento da nova organização de configurações do OuroPro

## Guia de Backend para Novos Aplicativos
- [x] Consolidar rotas de listas, imagens, ícones, avisos, comandos, conteúdo assistido e atualizações
- [x] Preparar guia técnico e PDF prontos para os desenvolvedores

## Correção de Atualização do OuroPro
- [x] Verificar por que a rota de atualização não está acionando o indicador amarelo do OuroPro
- [x] Restaurar o contrato compatível com o botão Atualizar agora do aplicativo
- [x] Validar URL e versão retornadas para o OuroPro

## Atualização do OuroPro na TV Box
- [x] Comparar versão e resposta de atualização recebidas pelo celular e pela TV Box
- [x] Corrigir qualquer incompatibilidade do backend que impeça o indicador e o download na TV Box
- [x] Restaurar a rota compatível /api/update.php usada pelas versões antigas da TV Box

## Diagnóstico NULL do OuroPro
- [ ] Localizar a tela de diagnóstico de categoria ausente do OuroPro
- [ ] Impedir a exibição de Diagnóstico NULL quando um canal não tiver categoria
- [ ] Usar uma categoria padrão sem interromper a reprodução

## Avisos Antigos Após Renovação
- [x] Identificar avisos de vencimento antigos que permanecem ativos após mudar a data do cliente
- [x] Arquivar avisos antigos ao renovar ou alterar a data de vencimento
- [x] Mostrar somente o aviso referente ao vencimento atual no modal

## Texto Null nos Aplicativos
- [x] Identificar os campos comuns que chegam nulos na tela principal dos APKs
- [x] Substituir valores nulos por textos ou valores seguros no backend
- [x] Validar as respostas de OuroPro, Ultra Player e Maximus sem null visível
- [x] Retornar conteúdo vazio em vez de null na rota compartilhada de conteúdo assistido

## Bolha Periódica Null no OuroPro
- [x] Rastrear a resposta periódica que faz o OuroPro exibir uma bolha com texto null
- [x] Impedir que o painel entregue mensagem nula, vazia ou inválida ao APK
- [x] Validar que a sincronização periódica continua ativa sem bolha null

## Auditoria de Avisos e Validade de Listas
- [x] Confirmar que avisos de vencimento, manutenção e failover permanecem ativos após a correção do OuroPro
- [x] Verificar se a validade pode ser lida automaticamente de listas M3U e XTeam ao cadastrar um usuário

## Validade Automática da Lista
- [x] Consultar a validade informada pelo provedor ao cadastrar ou editar uma lista
- [x] Preencher a data de vencimento somente quando o provedor retornar uma data válida
- [x] Manter a data manual intacta quando a lista não informar validade ou a consulta falhar
- [x] Adicionar botão de consultar validade nos formulários de cliente

## API do Servidor por Aplicativo
- [x] Confirmar qual aplicativo recebe a URL de API configurada no Maximus
- [x] Verificar se a URL é enviada indevidamente ao OuroPro ou se o OuroPro não possui integração para consumi-la

## Auditoria do Teste Maximus
- [x] Confirmar os endpoints que o OuroPro deve chamar no painel
- [x] Rastrear o destino de nome e telefone informados durante o teste do Maximus
- [x] Confirmar se o painel grava ou encaminha os dados do formulário de teste

## API Externa do Maximus
- [x] Confirmar que a URL configurada é entregue somente como configuração ao Maximus
- [x] Verificar se nome e telefone preenchidos na API externa retornam ao painel

## Registro Automático de Testes do Maximus
- [x] Criar rota segura para o Maximus registrar um teste concluído no painel
- [x] Registrar o cliente pelo nome informado seguido de (teste)
- [x] Evitar testes duplicados para o mesmo aparelho e tentativa
- [x] Enviar o resultado automaticamente pelo aplicativo após concluir o teste

## Correção do Fluxo de Teste Externo
- [x] Fazer o Maximus consumir a URL da API de bot recebida no campo dns_url
- [x] Extrair o resultado de teste da resposta da API externa sem adivinhar campos
- [x] Encaminhar nome, telefone e MAC ao painel somente após o teste concluir

## Contrato POST da API de Teste
- [ ] Separar no contrato do Maximus o endpoint da API de teste e a URL de DNS que será analisada
- [x] Enviar action=test_dns, source=maximus, MAC, nome e versão conforme o contrato recebido
- [x] Interpretar test.status e registration.registered retornados pela API externa

## URL Cadastrada como Teste do Maximus
- [x] Entregar a URL de API cadastrada também no campo explícito test_api_url
- [x] Enviar a mesma URL como destino do POST e como dns_url conforme a regra confirmada

## Contrato de Configuração do Maximus
- [x] Documentar a rota check_mac.php como a única fonte de dns_url para o aplicativo
- [x] Diferenciar a rota de provisionamento externo da rota de configuração do painel

## Organização de Aplicativos
- [x] Renomear Configurações do Ouro para Ouro Pro na navegação e nas telas
- [x] Renomear Ultra Player para Fusion preservando todas as configurações atuais
- [x] Preparar a base de recursos comuns para cadastrar próximos aplicativos
- [x] Manter para cada aplicativo imagens, ícones, mensagens, listas, atualização e integração por MAC

## Abas Individuais de Aplicativos
- [x] Remover a entrada Gerenciar Aplicativos da navegação
- [x] Criar uma aba individual de configuração para Prestige, Optimus, Império Play, Infinitus, Supremus e Evolux
- [x] Garantir que cada aba individual abra a tela completa de configurações
- [x] Manter Ouro Pro, Fusion e Maximus como abas individuais com suas configurações próprias

## Logos dos Aplicativos
- [x] Preparar os logos enviados de Optimus, Maximus, Infinitus, Fusion, Evolux, Império Play, Supremus e Prestige
- [x] Aplicar os logos corretos na Loja, Ranking, cards e abas de configuração
- [x] Preservar o logo já configurado do Ouro Pro

## Logo Atualizado do Império Play
- [x] Substituir o logo anterior do Império Play pelo novo arquivo enviado
- [x] Aplicar o novo logo na Loja, Ranking, página pública e configurações

## Troca do Logo Ultra para Fusion
- [x] Substituir o logo legado do Ultra pelo logo Fusion em configurações e respostas públicas
- [x] Atualizar o valor salvo do logo Ultra para impedir que ele sobrescreva o Fusion

## Loja de Todos os Aplicativos
- [x] Adicionar botão no topo da Loja privada para abrir a loja completa
- [x] Criar página pública com todos os aplicativos em lista vertical de download
- [x] Exibir logo, versão, disponibilidade e botão de baixar em cada aplicativo

## Acesso Público à Loja
- [x] Remover o redirecionamento para login da rota pública da Loja de Todos os Aplicativos — resolvido por página pública estática separada
- [x] Validar que somente a loja abre sem login e o painel continua protegido

## Loja sem Login
- [x] Disponibilizar um endereço de loja que não passe pela autenticação da hospedagem
- [x] Manter o painel administrativo acessível somente com login próprio

## Loja Pública no Domínio Principal
- [ ] Alterar a visibilidade da hospedagem para tornar renciaapp.manus.space/loja acessível sem login Manus
- [ ] Confirmar que o painel interno continua solicitando o login próprio após a alteração de visibilidade

## URL Pública Externa da Loja
- [x] Tentativa inicial: criar URL curta externa — substituída porque levava a uma página intermediária e à loja simplificada
- [x] Tentativa inicial: trocar o botão Loja de Todos os Aplicativos para usar a URL curta — substituída pela loja completa
- [x] Tentativa inicial validada tecnicamente, mas rejeitada por não reproduzir a loja montada
- [x] Executar 135 testes e checagem TypeScript sem erros
- [x] Salvar checkpoint da alteração

## Correção da URL Pública Externa
- [x] Substituir o encurtador que exibe página intermediária por URL pública com abertura direta da loja
- [x] Atualizar o botão interno para usar a nova loja externa completa

## Loja Pública Externa Completa
- [x] Recriar a página externa com o mesmo layout, cards, logos, downloads, códigos e carrossel da loja montada
- [x] Publicar a versão completa sem login e substituir o link público anterior — https://files.manuscdn.com/user_upload_by_module/session_file/310519663162366914/QHtPZdpabRVHrGkJ.html
- [x] Validar visual e conteúdo em acesso anônimo: Ouro Pro, Fusion, downloads, AFTV, códigos e carrossel exibidos
- [x] Executar 135 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint da correção

## Caminho Curto da Loja Completa
- [x] Criar um endereço curto para a loja pública completa — https://clck.ru/3VGecb
- [x] Atualizar o botão interno e validar: o endereço abre diretamente a loja completa sem login ou tela intermediária
- [x] Executar 135 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint do caminho curto

## Encurtamento Estilo Bitly
- [x] Verificar integração Bitly: indisponível sem autorização, usar encurtador público equivalente ao Bitly
- [x] Criar e validar o link no estilo Bitly: https://rb.gy/m52y0r abre diretamente a loja completa
- [x] Atualizar o botão do painel para usar o link menor
- [x] Executar 135 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint do link menor

## Parte Final Reduzida do Link
- [x] Verificar o encurtador atual: ele fixa uma parte final automática de seis caracteres e não libera alias personalizado sem conta
- [x] Testar o primeiro encurtador alternativo: ele exige pelo menos cinco caracteres e não conseguiu reservar o alias renci
- [x] Verificar o segundo encurtador alternativo: aliases personalizados exigem cadastro de conta
- [x] Criar uma parte final automática de quatro caracteres sem cadastro — https://ulvis.net/tKZf
- [x] Validar: o link de quatro caracteres abre diretamente a loja completa sem login
- [x] Atualizar o botão interno para o novo link mais curto
- [x] Executar 135 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint do link de quatro caracteres

## URL Curta nos Dois Lados
- [x] Identificar 1pt.co como domínio curto com alias personalizado, capaz de formar 1pt.co/loja
- [x] Criar o alias 1pt.co/loja, mas descartar seu uso: o redirecionamento depende de servidor com certificado expirado e não conclui a abertura
- [x] Encontrar t.ly como alternativa de domínio curto, gratuita e sem tela intermediária
- [x] Testar a criação no t.ly: o formulário fica em processamento sem concluir no ambiente atual
- [ ] Procurar outra alternativa pública de domínio curto com redirecionamento funcional
- [ ] Validar a nova URL, atualizar o botão interno e salvar checkpoint

## Império Play na Loja
- [x] Publicar o APK recebido do Império Play como download da loja — versão 5.5.0
- [x] Publicar as oito telas recebidas para o carrossel do Império Play
- [x] Atualizar a loja pública completa com o card e o carrossel do Império Play
- [x] Validar visualmente o card público: logo, versão 5.5.0, botão de download e primeira tela do carrossel exibidos
- [x] Validar avanço do carrossel: a tela de carregamento aparece ao avançar
- [x] Executar 136 testes e checagem TypeScript sem erros
- [x] Salvar checkpoint da atualização

## Código Downloader do Império Play
- [x] Cadastrar o código Downloader 7132543 e o link aftv.news/7132543
- [x] Atualizar a loja pública externa com o código e o botão AFTV
- [x] Validar os atalhos: código 7132543, download e botão AFTV exibidos na loja pública
- [x] Executar 136 testes e checagem TypeScript sem erros
- [x] Salvar checkpoint da atualização

## Análise de Logo Individual por MAC
- [x] Assistir ao vídeo completo e mapear o fluxo de escolha de logo por MAC, sem modificar o painel
- [x] Verificar a relação com o painel atual: a consulta valida o MAC, mas o logo configurado é compartilhado por aplicativo
- [x] Explicar o funcionamento observado ao usuário, sem alterar nenhuma configuração

## Orientação sobre Layouts do Aplicativo
- [x] Verificar os layouts existentes: não há seletor de Tema HTV ou de modelos completos de navegação no painel atual
- [x] Confirmar recursos atuais: cada aplicativo permite alterar logo, banner, fundo, imagem de mensagem, ícones e ajustes do reprodutor
- [ ] Explicar como aplicar os recursos visuais disponíveis hoje e o que seria necessário para um Tema HTV completo

## Múltiplos Layouts em um Único APK
- [ ] Definir os oito layouts internos do APK e seus identificadores técnicos
- [ ] Criar seleção de layout no cadastro/edição do MAC e retorno do layout escolhido na configuração do aplicativo
- [ ] Fazer o APK renderizar o layout escolhido ao consultar sua configuração por MAC

## Tutorial de Oito Layouts para Desenvolvedor
- [ ] Documentar os oito layouts, o seletor por MAC, a resposta JSON e a implementação no APK
- [ ] Entregar um tutorial técnico completo para o desenvolvedor do aplicativo

## Comando Remoto Não Entregue no Ouro Pro
- [ ] Verificar por que o comando Sincronizar acesso ficou na fila e expirou sem aparecer no Ouro Pro
- [ ] Confirmar se o APK consulta e confirma as rotas de comandos remotos
- [ ] Informar a causa e a correção necessária, sem alterar o painel antes do diagnóstico

## Novo Teste de Comando Remoto do Ouro Pro
- [x] Enviar novo comando Sincronizar acesso ao MAC 58:04:54:49:77:56 — comando 30001, válido até 17:48
- [ ] Verificar se o comando é entregue e orientar o teste no Ouro Pro

## Aviso Visível de Teste no Ouro Pro
- [x] Enviar comando Exibir aviso 60001 ao MAC 58:04:54:49:77:56, válido até 17:55
- [x] Cancelar o comando silencioso 30001 para não atrasar a entrega do aviso visível
- [ ] Orientar a confirmação do aviso na tela do aplicativo

## Ouro Pro Não Consulta Comandos Remotos
- [ ] Confirmar nos registros a ausência de consulta à rota /api/v5/remote-commands pelo Ouro Pro aberto
- [ ] Preparar a integração de consulta, exibição e confirmação que falta no APK Ouro Pro
- [ ] Informar ao usuário a causa confirmada e o material para o desenvolvedor

## Comandos Remotos Silenciosos no Ouro Pro
- [ ] Garantir que reiniciar player, atualizar lista, trocar lista, DNS e sincronizar acesso sejam executados sem modal
- [ ] Reservar aviso visível somente quando o painel enviar explicitamente um comunicado ao cliente
- [ ] Atualizar a orientação técnica do desenvolvedor com esse comportamento

## Exibir Aviso no Ouro Pro
- [ ] Fazer o APK consultar a fila de comandos e abrir o aviso enviado pelo painel
- [ ] Confirmar ao painel que a mensagem foi mostrada para retirar o comando da fila

## Comandos Remotos para Todos os MACs
- [ ] Garantir que cada Ouro Pro consulte a fila usando o próprio MAC, sem receber comandos de outro aparelho
- [ ] Explicitar no guia que a mesma integração vale para todos os MACs cadastrados

## Fila Persistente de Comandos no Ouro Pro
- [ ] Atualizar o APK Ouro Pro para consultar a fila de comandos antes de novos testes
- [ ] Repetir o teste apenas após instalar a versão do APK com consulta e confirmação implementadas

## Compatibilidade da Integração de Comandos do Ouro Pro
- [ ] Identificar a rota e o formato usados pela integração já implementada no APK Ouro Pro
- [ ] Comparar a chamada real do APK com /api/v5/remote-commands e /api/v5/remote-commands/ack
- [ ] Corrigir a incompatibilidade encontrada e repetir o teste de entrega

## Correção de Comandos com MAC Duplicado
- [x] Identificar a causa: o MAC 98:C9:7C:D2:C5:AA possui dois cadastros e a fila estava sendo consultada no cadastro errado
- [x] Ajustar a busca e a confirmação de comandos para localizar o cadastro que possui a ordem pendente
- [x] Criar teste de regressão para MAC duplicado e validar 137 testes e TypeScript sem erros
- [ ] Salvar checkpoint e repetir o teste de entrega no Ouro Pro

## Lixeira de Avisos e Comandos Remotos
- [x] Adicionar exclusão individual de avisos/comandos finalizados do histórico
- [x] Adicionar limpeza de todos os comandos finalizados do histórico
- [x] Executar 138 testes e checagem TypeScript sem erros
- [x] Validar o fluxo por testes; prévia visual exige login do painel
- [ ] Salvar checkpoint da lixeira de comandos

## Comandos Remotos por DNS
- [x] Listar as DNS/servidores cadastrados e a quantidade de clientes vinculados
- [x] Permitir escolher destino por MAC individual ou por grupo de DNS
- [x] Enfileirar o comando apenas para os clientes vinculados à DNS selecionada
- [x] Exibir confirmação com quantidade de clientes antes de enfileirar o comando por DNS
- [x] Executar 140 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint do envio por DNS

## Correção de Destinos por DNS e Todos os MACs
- [x] Listar DNS extraídas diretamente das listas M3U/Xtream cadastradas dos clientes
- [x] Adicionar destino para todos os MACs cadastrados do painel
- [x] Mostrar quantidade de aparelhos e pedir confirmação antes do envio em massa
- [x] Executar 141 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint da correção de destinos

## Carrossel do Fusion na Loja
- [x] Publicar as oito imagens recebidas do Fusion em URLs permanentes
- [x] Adicionar as imagens ao carrossel do Fusion na loja pública
- [x] Validar visualmente a primeira tela do Fusion, seus controles de carrossel, download e AFTV na loja pública
- [x] Confirmar que o carrossel do Fusion mostra os controles de navegação entre as oito telas
- [x] Executar 141 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint do carrossel do Fusion

## Conexão do Optimus com o Painel
- [x] Confirmar rota, parâmetros por MAC e configuração entregue ao Optimus
- [x] Identificar a causa: o mesmo MAC tinha cadastro Ouro Pro e Optimus, mas a rota selecionava o primeiro registro
- [x] Preparar a instrução técnica corrigida para o desenvolvedor do Optimus

## Nome Incorreto no Optimus
- [ ] Verificar por que o APK está exibindo New em vez de Optimus
- [ ] Corrigir o campo de nome entregue ao Optimus e validar a resposta

## Dashboard com MAC Duplicado entre Aplicativos
- [x] Corrigir a atividade no cadastro do aplicativo consultado quando o mesmo MAC existe em Ouro Pro e Optimus
- [x] Mostrar Nome do servidor e aplicativo do registro correto no Dashboard
- [x] Validar: a consulta do Optimus atualizou o cadastro Optimus, enquanto o registro antigo New permaneceu sem atividade nova
- [x] Executar 142 testes e checagem TypeScript sem erros
- [ ] Salvar checkpoint da correção do Dashboard

## Lista Retornando HTML em Vez de M3U/JSON
- [ ] Localizar o MAC e a URL de lista que aponta para onixspeed.shop
- [ ] Confirmar se o painel entrega a URL cadastrada ou uma rota antiga/incorreta
- [ ] Informar a correção segura sem substituir listas válidas

## Erro JSON no New Vision — MAC 07:80:C8:3C:53:15
- [ ] Inspecionar os dois cadastros e todas as listas vinculadas ao MAC afetado
- [ ] Identificar qual URL de séries devolve HTML XUI ao aplicativo
- [ ] Corrigir a entrega sem remover listas válidas e validar o novo retorno

## PDF Universal de Rotas dos Aplicativos
- [x] Consolidar as rotas de conexão, configuração, listas, mensagens, comandos, atualização e monitoramento
- [x] Incluir exemplos corretos para Ouro Pro, Fusion, Maximus, Optimus e os demais aplicativos
- [x] Gerar PDF de nove páginas, compilar sem avisos e validar com verificação determinística e revisão visual

## Travamento Android por Campo Nulo
- [x] Identificar aplicativo, MAC e rota: Evolux, MAC 8C:97:31:CD:31:8A, rota /api/v5/apps/evolux/config
- [x] Confirmar que a configuração do painel não retorna campos JSON nulos
- [x] Preparar a correção obrigatória de Enum.valueOf seguro para o desenvolvedor do APK Evolux
- [ ] Substituir ou regularizar a lista epics.zip, que responde HTTP 403 com HTML neste momento

## Evolux Valida MAC mas Não Abre Lista
- [x] Confirmar que o MAC é validado e o travamento acontece depois na abertura da lista
- [x] Cadastrar uma lista M3U válida para o MAC 8C:97:31:CD:31:8A
- [ ] Validar a reprodução no Evolux após trocar a fonte

## Acesso ao Aplicativo por Login e Senha
- [ ] Definir cadastro de credenciais de aplicativo vinculadas a DNS, lista e validade
- [ ] Criar rota segura de autenticação do aplicativo por login e senha
- [ ] Manter suporte ao modo atual por MAC como alternativa
- [ ] Preparar o contrato de integração para os desenvolvedores dos aplicativos

## Nova Lista do Evolux
- [x] Testar a URL OnixSpeed fornecida: resposta HTTP 200 e conteúdo reconhecido como playlist M3U
- [x] Substituir somente a lista principal do Evolux e confirmar a URL pela rota de configuração

## Correção de MAC Duplicado entre Aplicativos
- [x] Identificar a causa: o MAC 07:80:C8:3C:53:15 tem cadastro Ouro Pro e cadastro Optimus, e a rota escolhia o Ouro Pro primeiro
- [x] Fazer a rota do Optimus selecionar o cadastro compatível com o próprio aplicativo
- [x] Criar teste de regressão para o mesmo MAC usado em aplicativos diferentes
- [ ] Validar a rota do Optimus com o MAC cadastrado e salvar checkpoint

## Retorno command=null no Ouro Pro
- [ ] Comparar o MAC que o APK está consultando com o dispositivo e a ordem pendente
- [ ] Corrigir a seleção da fila que ainda responde command=null
- [ ] Validar o retorno com um aviso novo sem cancelar a ordem

## Endereço Público da Loja
- [x] Usar /loja como endereço público da Loja de Todos os Aplicativos
- [x] Mover a configuração administrativa da loja para uma rota interna protegida

## Contraste do Botão da Loja Completa
- [x] Garantir texto legível no botão Loja de Todos os Aplicativos em temas claro e escuro

## Carrosséis da Loja de Aplicativos
- [x] Criar carrossel reutilizável de imagens na página pública de cada aplicativo
- [x] Adicionar as cinco imagens enviadas ao carrossel de apresentação do Ouro Pro
- [x] Preparar os demais aplicativos para receber seus próprios carrosséis

## Códigos Numéricos do Downloader
- [x] Confirmar como gerar códigos numéricos usando os links finais dos APKs
- [x] Orientar o uso de um código por aplicativo para download direto no Downloader

## Código Downloader do Ouro Pro
- [x] Salvar o código 7469834 do Ouro Pro nas configurações de download
- [x] Exibir o código Downloader do Ouro Pro na loja privada e na página pública

## Código Downloader do Fusion
- [x] Salvar o código 8461304 do Fusion nas configurações de download
- [x] Exibir o código Downloader do Fusion na loja privada e na página pública

## Links Curtos AFTV
- [x] Salvar os links aftv.news/7469834 do Ouro Pro e aftv.news/8461304 do Fusion
- [x] Exibir links AFTV clicáveis nas lojas privada e pública

## Novos Aplicativos do Painel
- [x] Cadastrar Prestige, Optimus, Império Play, Infinitus, Supremus e Evolux no catálogo comum
- [x] Adicionar os seis aplicativos ao cadastro e à edição de clientes
- [x] Exibir os seis aplicativos na Loja Pública com link, versão e ativação próprios
- [x] Incluir os seis aplicativos no Ranking de Aplicativos
- [x] Criar configurações equivalentes de imagens, ícones, mensagens, listas, MAC e atualização para cada aplicativo

## Tela Completa dos Novos Aplicativos
- [x] Reproduzir as seções completas da configuração do Maximus para Prestige, Optimus, Império Play, Infinitus, Supremus e Evolux
- [x] Incluir uploads, prévias e tamanhos de banner, logo e imagem de fundo em cada tela
- [x] Incluir mensagens, bloqueio, renovação, API, atualização e demais recursos do padrão Maximus

## Abertura e Conteúdo do Evolux Player
- [x] Trocar o movimento lateral do logo por efeito de brilho/pulso — descartado a pedido do usuário
- [x] Exibir Evolux Player com animação de máquina de escrever e fonte atualizada — descartado a pedido do usuário
- [x] Garantir a seção Séries na tela inicial do aplicativo — descartado a pedido do usuário

## Retomada do Guia Técnico
- [x] Concluir o PDF unificado de todas as rotas após descartar o ajuste visual do Evolux solicitado por engano

## Guia Unificado de Rotas dos Aplicativos
- [x] Inventariar as rotas de Ouro Pro, Fusion, Maximus e novos aplicativos
- [x] Documentar mensagens, vencimento, failover, listas, atualizações, comandos e testes
- [x] Gerar um único PDF técnico pronto para os desenvolvedores

## Auditoria de Rotas dos Documentos Enviados (24/08/2026)
- [x] Extrair todas as rotas descritas nos sete PDFs enviados
- [x] Comparar cada rota documentada com a implementação do painel
- [x] Testar as rotas confirmadas e documentar a única rota de domínio externo

## Backup Portátil Completo (24/08/2026)
- [x] Auditar as tabelas e configurações incluídas no backup atual
- [x] Gerar arquivo baixável com todos os dados do banco e instruções de restauração
- [x] Validar a integridade do backup sem alterar os dados em produção

## Correção de MAC e Atividade (25/08/2026)
- [x] Confirmar que o MAC iniciado em 18 é o dispositivo correto solicitado
- [x] Validar que a atividade recebida pertence ao próprio MAC iniciado em 18
- [x] Preservar os demais cadastros e MACs durante a correção

## Lista no APK Novo para MAC 18 (25/08/2026)
- [x] Confirmar a lista vinculada ao MAC iniciado em 18
- [x] Associar o MAC iniciado em 18 ao aplicativo Nexus sem apagar sua lista
- [x] Testar a resposta de lista esperada pelo APK novo

## Suporte ao Nexus (25/08/2026)
- [x] Adicionar o Nexus ao catálogo de aplicativos gerenciados
- [x] Associar o MAC iniciado em 18 ao Nexus preservando a lista atual
- [x] Validar `/api/v5/apps/nexus/config` e `/api/v5/apps/nexus/update`
- [x] Incluir o Nexus no catálogo e no ranking de aplicativos do painel

## Painel de Revendas e Controle Administrativo (25/08/2026)
- [x] Confirmar o login separado por e-mail e senha para cada revenda
- [x] Garantir que apenas o administrador altere senhas, dados e limites de revendas
- [x] Exibir quantos clientes cada revenda cadastrou e mantém ativos
- [x] Criar ranking por revenda com instalações e uso dos aplicativos vinculados aos seus clientes
- [x] Medir instalações confirmadas pelo primeiro heartbeat do APK, sem confundir cadastro com download real
- [x] Testar isolamento de dados entre revendas e os controles do administrador
- [x] Adicionar atalho direto para o ranking no gerenciamento de revendas

## Entrada pelo Domínio Público (25/08/2026)
- [x] Fazer a rota inicial abrir a tela de login por e-mail e senha quando não houver sessão
- [x] Redirecionar uma conta autenticada para o painel autorizado
- [x] Validar o isolamento da sessão entre administrador e revenda

## Correção de Senha de Revenda (25/08/2026)
- [x] Sincronizar a senha alterada pelo administrador com o login local de revenda
- [x] Validar que a nova senha passa a autenticar imediatamente

## Backup Completo e Proteção Semanal (25/08/2026)
- [x] Confirmar que o exportador inclui usuários, MACs, dispositivos, listas, configurações e credenciais de login
- [x] Adicionar botão visível para gerar e baixar backup completo sob demanda
- [x] Adicionar aviso semanal de backup dentro do painel
- [x] Definir cópias automáticas armazenadas e aviso semanal com download manual
- [ ] Manter cópias automáticas armazenadas sem depender de o painel estar aberto
- [x] Testar importação do arquivo sem apagar dados atuais antes da restauração

## Documento de Integração Universal para APKs (25/08/2026)
- [x] Mapear rotas reais para configuração, imagens, ícones, mensagens e listas
- [x] Produzir PDF universal de integração para todos os APKs

## Conferência de PDF Enviado (25/08/2026)
- [x] Revisar o PDF enviado e comparar seu conteúdo com as rotas atuais do painel

## Cadastro do Cliente Velox no Evolux (25/08/2026)
- [x] Verificar se o MAC informado já possui um cadastro ou listas vinculadas
- [x] Cadastrar o cliente Velox no Evolux com acesso somente por MAC
- [x] Validar a rota de configuração do Evolux para o novo cadastro

## Diagnóstico do PrimeX no Prestige (25/08/2026)
- [x] Conferir o cadastro do MAC exibido e seu vínculo com a família Prestige
- [x] Informar a correção necessária antes de criar ou alterar qualquer cadastro

## Cadastro do PrimeX no Prestige (25/08/2026)
- [x] Confirmar o MAC e a ausência de cadastro existente
- [x] Cadastrar o PrimeX no Prestige com acesso somente por MAC
- [x] Validar a rota Prestige para o MAC cadastrado

## Diagnóstico do Magnus TV (25/08/2026)
- [x] Conferir se o MAC exibido possui cadastro ou listas vinculadas
- [x] Identificar a rota ou família necessária para o Magnus TV consultar o painel
- [x] Informar a correção necessária antes de criar ou alterar qualquer cadastro

## Catálogo de Aplicativos Ominus, Magnus e Excellence (25/08/2026)
- [x] Mapear referências do Nexus e preservar seus clientes cadastrados
- [x] Adicionar Ominus, Magnus e Excellence ao catálogo e às rotas próprias
- [x] Exibir os três aplicativos no cadastro e nas configurações do painel
- [x] Remover apenas Nexus das opções para novos cadastros sem apagar dados existentes
- [x] Testar o catálogo, as telas e as rotas dos três novos aplicativos

## Diagnóstico da Troca Automática de Lista do Ouro Pro (25/08/2026)
- [x] Identificar o cliente afetado, a lista principal e as listas de reserva
- [x] Conferir registros de falha, failover e comunicação do APK com o painel
- [x] Corrigir somente a causa confirmada sem alterar listas válidas
- [ ] Validar a troca automática e o retorno recebido pelo APK

## Diagnóstico de MAC Compartilhado entre Aplicativos (25/08/2026)
- [x] Conferir cadastros e rotas de Magnus, Ominus e Excellence sem alterar dados
- [x] Rastrear a origem do MAC exibido pelos APKs
- [x] Corrigir apenas a causa confirmada e validar a separação

## Aplicativo Correto em Assistindo (25/08/2026)
- [x] Mapear a rota de atividade e a seleção do cadastro pelo MAC
- [x] Selecionar o cadastro compatível com o aplicativo que enviou a atividade
- [x] Testar o mesmo MAC em aplicativos distintos sem misturar a atividade

## Logo do Optimus (25/08/2026)
- [x] Preparar o logo enviado para uso no painel
- [x] Aplicar o logo do Optimus na loja, ranking, cadastro e configurações
- [x] Verificar o logo nas telas e na configuração entregue ao APK

## Logos no Seletor de APK (25/08/2026)
- [x] Exibir logo e nome em cada opção de APK no cadastro de usuários
- [x] Aplicar a mesma apresentação na edição de usuários
- [x] Conferir visualmente Ouro Pro e os demais aplicativos no seletor

## Correção de Exibição do Logo Optimus (25/08/2026)
- [x] Identificar por que loja e ranking não mostram o logo enviado
- [x] Aplicar o logo enviado nas telas visíveis da loja e do ranking
- [x] Validar visualmente o logo nas duas telas antes de entregar

## Logo do Fusion (25/08/2026)
- [x] Preparar o logo enviado para uso no painel
- [x] Aplicar o logo Fusion na loja, ranking, cadastro e configurações
- [x] Validar visualmente o logo Fusion nas telas internas

## Logo do Supremus (25/08/2026)
- [x] Preparar o logo enviado para uso no painel
- [x] Aplicar o logo Supremus na loja, ranking, cadastro e configurações
- [x] Validar visualmente o logo Supremus nas telas internas

## Nome Visual Supreme (25/08/2026)
- [x] Atualizar o nome visível de Supremus para Supreme sem alterar a rota técnica
- [x] Conferir o nome e o logo Supreme nas telas internas

## Logo do Império Play (25/08/2026)
- [x] Preparar o logo enviado para uso no painel
- [x] Aplicar o logo Império Play na loja, ranking, cadastro e configurações
- [x] Validar visualmente o logo Império Play nas telas internas

## Logo do Infinitus (25/08/2026)
- [x] Preparar o logo enviado para uso no painel
- [x] Aplicar o logo Infinitus na loja, ranking, cadastro e configurações
- [x] Validar visualmente o logo Infinitus nas telas internas

## Logos Ominus, Magnus, Evolux e Maximus (25/08/2026)
- [x] Preparar os quatro logos enviados para uso no painel
- [x] Aplicar os logos Ominus, Magnus, Evolux e Maximus na loja, ranking, cadastro e configurações
- [x] Validar visualmente os quatro logos nas telas internas
- [x] Incluir Ominus e Magnus no ranking mesmo quando ainda não houver clientes cadastrados

## Logos Excellence e Prestige (25/08/2026)
- [x] Preparar os dois logos enviados para uso no painel
- [x] Aplicar os logos Excellence e Prestige na loja, ranking, cadastro e configurações
- [x] Validar visualmente os logos nas telas internas
- [x] Incluir Excellence no ranking mesmo quando ainda não houver clientes cadastrados
