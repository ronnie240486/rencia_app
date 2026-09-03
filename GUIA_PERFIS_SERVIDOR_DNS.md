# Perfis de servidor e failover de DNS

O campo **Grupo** da tela de DNS funciona como o nome livre do perfil de servidor. Por exemplo, todas as DNS do servidor Club ficam no grupo `Club`, enquanto as DNS do servidor Onix ficam no grupo `Onix`. Cada grupo pode ter qualquer quantidade de DNS ativa.

## Cadastro

Cadastre cada host uma vez em **Gerenciar DNS**, repetindo o mesmo grupo para as rotas do mesmo servidor. Ao cadastrar um cliente, selecione o perfil no campo **Perfil do servidor** e escolha a DNS principal. Para XTeam, a M3U é montada automaticamente com o host principal. Para uma M3U já pronta, o host é substituído e o caminho, usuário e senha são preservados.

## Entrega ao aplicativo

O painel monitora a DNS principal da M3U e, quando ela falha, testa em paralelo as DNS ativas do mesmo perfil. Se alguma responder, o painel atualiza a URL M3U do cadastro, preservando caminho, usuário e senha. O APK continua recebendo a mesma lista e não precisa trocar a rota de DNS durante a reprodução. Os campos `primary_dns_url`, `failover_urls` e `server_profile` permanecem disponíveis para diagnóstico e sincronização.

Se nenhuma DNS do perfil responder, o painel mantém o registro da falha e o APK pode acionar o fluxo existente de **Change Playlist**. Essa segunda etapa troca para a Lista 2 ou para a próxima lista reserva. A resposta contém `switch_applied: true` quando a playlist foi alterada. Portanto, DNS failover ocorre no painel primeiro; playlist failover é a segunda etapa.

O painel não altera credenciais, listas extras, MACs ou vencimento ao montar as alternativas. O failover automático precisa ser suportado pelo APK; o painel entrega as rotas organizadas e a rota de playback informa se a recuperação ocorreu na DNS ou na playlist.

## Troca em massa

Na tela DNS, use **Trocar perfil de servidor em massa**. Selecione o perfil atual, o novo perfil e a DNS principal do destino. A ação troca somente clientes cuja M3U principal pertence ao perfil de origem, preserva o restante da URL e atualiza o nome do servidor do cliente. Os grupos originais e seus cadastros continuam preservados.
