# Atualização do Railway para backup 4.0

O serviço externo `gerencia.up.railway.app` precisa executar o backend atual e aplicar apenas atualizações aditivas antes de receber a versão. O arquivo `railway.json` define a etapa prévia `node scripts/railway-additive-migrate.mjs` e a inicialização com `pnpm start`.

Essa etapa acrescenta somente colunas e a tabela de vínculos de aplicativos que faltarem; ela não remove clientes, MACs, listas, configurações ou tabelas existentes. Conforme a documentação do Railway, comandos pré-implantação são executados entre a compilação e a publicação e recebem as variáveis de ambiente do serviço, sendo apropriados para migrações de banco de dados.

Referências: https://docs.railway.com/deployments/pre-deploy-command e https://docs.railway.com/config-as-code/reference.
