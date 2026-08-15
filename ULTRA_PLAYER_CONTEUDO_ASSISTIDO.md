# Integração Ultra Player — Conteúdo Assistido em Tempo Real

**Destinatário:** Desenvolvedor do Ultra Player  
**Objetivo:** Informar ao painel qual canal, filme ou série o cliente está assistindo, tanto no aplicativo mobile quanto na TV/TV Box.

## Endpoint único

O mesmo endpoint deve ser usado no celular e na TV:

```text
GET https://renciaapp.manus.space/api/v5/heartbeat?mac={MAC}&current_content={NOME_DO_CONTEUDO}
```

| Parâmetro | Obrigatório | Descrição |
|---|---:|---|
| `mac` | Sim | MAC do aparelho que está reproduzindo o conteúdo. |
| `current_content` | Sim | Nome visível do canal, filme ou série em reprodução. |

O parâmetro alternativo `content` também é aceito, mas deve-se preferir `current_content`.

## Exemplo de chamada

Quando o usuário estiver assistindo ao canal Globo HD:

```text
https://renciaapp.manus.space/api/v5/heartbeat?mac=AA:BB:CC:DD:EE:FF&current_content=Globo%20HD
```

A resposta esperada é semelhante a:

```json
{
  "success": true,
  "mac": "AA:BB:CC:DD:EE:FF",
  "contentUpdated": true,
  "timestamp": "2026-08-15T00:00:00.000Z"
}
```

## Regras de implementação

O aplicativo deve enviar a chamada ao iniciar uma reprodução, sempre que o usuário trocar de canal, filme ou episódio e também a cada **60 segundos** enquanto o mesmo conteúdo continuar sendo assistido. Esse envio periódico é necessário para que o painel continue mostrando corretamente o conteúdo mesmo quando a pessoa permanece por bastante tempo no mesmo canal.

O valor de `current_content` deve ser enviado com URL encoding. Não enviar vazio, nulo ou o texto “undefined”: quando o conteúdo não é enviado, o painel preserva o último valor válido registrado.

| Evento no Ultra Player | Ação exigida |
|---|---|
| Início de canal, filme ou série | Enviar imediatamente o MAC e o título. |
| Troca de canal, filme, série ou episódio | Enviar imediatamente o novo título. |
| Permanência no mesmo conteúdo | Repetir o envio a cada 60 segundos. |
| Encerramento do player | Nenhuma chamada obrigatória; o painel usará a última atividade registrada. |

## Exemplo lógico

```text
onPlaybackStartedOrChanged(title):
  sendHeartbeat(mac, title)
  startOrResetTimer(60 seconds, () => sendHeartbeat(mac, currentTitle))
```

> Esta integração deve funcionar da mesma forma em **mobile**, **TV Android**, **TV Box** e qualquer outra versão do Ultra Player. O MAC deve ser sempre o MAC real do aparelho atual.

## Resultado esperado no painel

Após a integração, o painel Rencia App mostrará em tempo real o canal, filme ou série que está sendo assistido. O dado será atualizado a cada troca e mantido durante a reprodução contínua.
