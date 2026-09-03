# Perfis de servidor e failover de DNS

O campo **Grupo** da tela de DNS funciona como o nome livre do perfil de servidor. Por exemplo, todas as DNS do servidor Club ficam no grupo `Club`, enquanto as DNS do servidor Onix ficam no grupo `Onix`. Cada grupo pode ter qualquer quantidade de DNS ativa.

## Cadastro

Cadastre cada host uma vez em **Gerenciar DNS**, repetindo o mesmo grupo para as rotas do mesmo servidor. Ao cadastrar um cliente, selecione o perfil no campo **Perfil do servidor** e escolha a DNS principal. Para XTeam, a M3U é montada automaticamente com o host principal. Para uma M3U já pronta, o host é substituído e o caminho, usuário e senha são preservados.

## Entrega ao aplicativo

As respostas modernas dos APKs recebem `primary_dns_url`, `failover_urls` e `server_profile`. A lista `failover_urls` contém a M3U principal e as alternativas do mesmo grupo, mantendo o caminho e os parâmetros da M3U. O APK deve tentar a URL principal e, em caso de timeout ou falha de conexão, tentar as alternativas na ordem cadastrada.

O painel não altera credenciais, listas extras, MACs ou vencimento ao montar as alternativas. O failover automático precisa ser suportado pelo APK; o painel apenas entrega as rotas organizadas.

## Troca em massa

Na tela DNS, use **Trocar perfil de servidor em massa**. Selecione o perfil atual, o novo perfil e a DNS principal do destino. A ação troca somente clientes cuja M3U principal pertence ao perfil de origem, preserva o restante da URL e atualiza o nome do servidor do cliente. Os grupos originais e seus cadastros continuam preservados.
