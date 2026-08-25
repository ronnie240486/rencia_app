# Guia de Backup Completo do Rencia App

Este pacote foi preparado para permitir a migração do painel para outro servidor sem alterar o banco atual.

## Conteúdo do pacote

| Arquivo | Conteúdo |
|---|---|
| `database/database-completo.sql` | Estrutura e dados de todas as tabelas existentes no banco. |
| `database/manifesto.json` | Quantidade de registros por tabela e checksum SHA-256 do dump. |
| `database/LEIA-ME-RESTAURACAO.md` | Passos de importação do banco. |
| `rencia_app_source.zip` | Código-fonte do painel, migrations, testes e configurações não sensíveis. |
| `media-urls.txt` | URLs de arquivos externos referenciados pelos dados, quando existentes. |

## Restauração em outro ambiente

1. Crie um banco MySQL ou TiDB vazio.
2. Importe `database/database-completo.sql` com um usuário que tenha permissão para criar tabelas e inserir dados.
3. Extraia `rencia_app_source.zip`, execute `pnpm install` e configure o ambiente Node.js.
4. Defina uma nova `DATABASE_URL` apontando para o banco restaurado e crie novos segredos para `JWT_SECRET` e integrações externas.
5. Execute `pnpm check` e `pnpm build` antes de publicar.
6. Copie os arquivos apontados em `media-urls.txt` para o novo armazenamento antes de desligar a hospedagem atual.

## Segurança

> O dump pode conter dados pessoais, hashes de senha, configurações e URLs de listas. Guarde este pacote em local privado, protegido por senha ou criptografia, e não o envie em grupos ou redes sociais.

Os segredos de infraestrutura do ambiente atual não são incluídos. Eles devem ser recriados ou configurados de forma segura no novo provedor.
