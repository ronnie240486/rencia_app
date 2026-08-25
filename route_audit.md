# Auditoria de Rotas dos PDFs Enviados

## Documentos analisados

Foram extraídas as referências de rota de sete PDFs enviados pelo usuário: o guia unificado, o guia de backend de novos aplicativos, o contrato do Maximus, a correção do Evolux e quatro documentos `main`.

## Resultado da comparação

| Grupo documentado | Situação no painel | Evidência inicial |
|---|---|---|
| Validação e playlists (`/api/device/check`, `/api/guim.php`, aliases v4/v5) | Implementado | Handlers localizados e respostas HTTP 200 com MAC de teste não cadastrado. |
| Heartbeat, conteúdo assistido e vencimento | Implementado | `GET /api/v5/heartbeat`, `GET /api/v5/current-watching`, `POST /api/v5/update-watching` e `GET /api/v5/list-notifications` foram localizados. |
| Alertas, failover e comandos remotos | Implementado | Handlers para leitura/ack de alertas, falha de reprodução e comandos remotos existem no backend. |
| Atualização dos aplicativos | Implementado | Rotas específicas de OuroPro, Ultra, Maximus e rota genérica `/api/v5/apps/:appId/update` foram localizadas. |
| Configuração dos novos apps, incluindo Evolux | Implementado | A rota genérica `/api/v5/apps/:appId/config` atende Evolux, Optimus, Império, Infinitus, Prestige e Supremus. |
| Contrato externo `https://painelepic.lat/api/chatbot/OxLA7ppWZ7/x2YD0v1QPa` | Externo ao painel | O PDF aponta para outro domínio; o painel possui `POST /api/v5/maximus-test-result`, com finalidade relacionada, mas não registra aquele caminho externo. |

## Matriz de compatibilidade

| Rota ou família descrita | Método documentado | Situação encontrada |
|---|---:|---|
| `/api/device/check` e `/api/v5/check_mac.php` | GET | Implementadas. A rota v5 funciona como alias de compatibilidade. |
| `/api/guim.php`, `/api/v4/guim.php`, `/api/v5/guim.php` | GET/POST conforme APK | Implementadas. As versões continuam disponíveis para compatibilidade. |
| `/api/v4/bg.php`, `/api/v4/logo.php`, `/api/v4/icon/:name`, `/api/v4/update.php` | GET | Implementadas. As imagens e ícones respondem por redirecionamento HTTP quando configurados. |
| `/api/v5/heartbeat` e `/api/v4/heartbeat.php` | GET e POST | Implementadas para presença e conteúdo assistido. |
| `/api/v5/list-notifications` e `/ack` | GET e POST | Implementadas. Com MAC inexistente retornam 404, que confirma a rota e evita criar dados de teste. |
| `/api/v5/playback-failure` | POST | Implementada. Requisição vazia retorna 400, como esperado para payload inválido. |
| `/api/v5/remote-commands` e `/ack` | GET e POST | Implementadas. Com MAC inexistente retornam 404 e payload vazio recebe 400. |
| `/api/v5/ultra-config`, `/ultra-update`, `/maximus-update` | GET | Implementadas. Rejeitam MAC não cadastrado com 404. |
| `/api/v5/apps/{appId}/config` e `/update` | GET | Implementadas. Cobrem Evolux, Optimus, Império, Infinitus, Prestige e Supremus pelo mesmo contrato. |
| `/api/v5/check_expire.php`, `/get_playlists`, `/get_playlist_roku`, `/getdns_list`, `/mac_exists` | GET | Implementadas e responderam no teste controlado. |
| `/api/v5/current-watching`, `/most-watched`, `/recently-viewed` | GET | Implementadas e responderam no teste controlado. |
| `/api/v5/update-watching` e `/api/v5/maximus-test-result` | POST | Implementadas. Requisições sem corpo válido retornaram 400 sem efeitos colaterais. |
| `/api/app-config`, `/api/public/apps`, `/api/upload-apk`, `/api/upload-image` | GET/POST | Implementadas no painel. Uploads exigem sessão autorizada e não foram executados na auditoria. |

## Contrato do Maximus

O PDF `MAXIMUS_API_CONTRATO_BACKEND.pdf` referencia `POST https://painelepic.lat/api/chatbot/OxLA7ppWZ7/x2YD0v1QPa`. Esse endereço pertence a outro domínio e não deve ser confundido com uma rota do Rencia. No Rencia, a etapa de registrar um teste já existe em `POST /api/v5/maximus-test-result`, que recebe o resultado concluído e protege um cliente existente de ser sobrescrito por um teste.

Se o objetivo for que o Rencia substitua o serviço externo de `painelepic.lat`, será necessário definir uma rota pública equivalente e uma política de autenticação. Essa mudança não foi feita automaticamente, pois o caminho no PDF contém identificadores opacos de um serviço externo e não comprova que ele deva ser exposto no domínio do painel.

## Observações de leitura

Algumas rotas extraídas aparecem truncadas nos PDFs por quebra de linha, como `/api/v5/apps/evolux/c` e `/api/v5/current-`. Elas foram tratadas como referências incompletas e comparadas com os caminhos completos documentados nos mesmos guias, por exemplo `/api/v5/apps/evolux/config` e `/api/v5/current-watching`.

## Validação realizada

Foram executadas chamadas sem efeitos colaterais para 31 endpoints documentados. Rotas com MAC inexistente retornaram 404 de forma esperada, e rotas POST sem corpo válido retornaram 400. Isso confirma que os handlers existem e que a validação de entrada está ativa.
