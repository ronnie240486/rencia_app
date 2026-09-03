# Rota universal de fallback de EPG

## Objetivo

Quando a lista do cliente não trouxer um endereço de EPG, o aplicativo pode consultar o painel e usar o EPG individual do cadastro ou o EPG padrão configurado pelo proprietário.

## Endpoint

```text
GET /api/v5/epg?mac=AA:BB:CC:DD:EE:FF&app_id=ouropro
```

O parâmetro `mac` é obrigatório. O parâmetro `app_id` é recomendado para que o painel valide que o MAC está vinculado ao aplicativo que fez a consulta. O endpoint aceita MAC principal e MAC secundário vinculado ao mesmo cliente.

## Resposta com EPG disponível

```json
{
  "available": true,
  "mac": "AA:BB:CC:DD:EE:FF",
  "app_id": "ouropro",
  "epg_url": "https://iptv-epg.org/files/epg-br.xml",
  "source": "default"
}
```

O campo `source` será `device` quando o usuário possuir um EPG próprio e `default` quando a rota utilizar o EPG padrão do painel. Se nenhum endereço estiver configurado, a resposta será `available: false`, `epg_url: null` e `source: "none"`.

## Fluxo recomendado no APK

Primeiro, o aplicativo deve usar o EPG presente na própria lista, quando existir. Se esse campo estiver vazio, deve consultar a rota universal com o MAC do aparelho e seu identificador de aplicativo. Quando `available` for `true`, o APK deve baixar e interpretar o endereço XMLTV devolvido em `epg_url`. O aplicativo deve manter cache local e renovar a consulta periodicamente, sem bloquear a reprodução caso o EPG esteja indisponível.

## Erros principais

| HTTP | Significado |
|---|---|
| 400 | MAC ou aplicativo inválido |
| 403 | O MAC não está vinculado ao aplicativo informado |
| 404 | MAC não cadastrado |
| 503 | Banco do painel temporariamente indisponível |

A rota não altera listas, MACs, validade ou cadastro do cliente. Ela somente resolve o endereço EPG aplicável ao aparelho.
