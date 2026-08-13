# Integração dos ícones dinâmicos do Ultra Player

Encaminhe a mensagem abaixo ao desenvolvedor do APK.

---

Olá. O painel do Ultra Player já possui configuração remota para **logo, banner, fundo, mensagens** e para os ícones dos botões **Canais, Filmes e Séries**. Por favor, integre o APK com a rota abaixo.

## Rota a chamar

```text
GET https://renciaapp.manus.space/api/v5/ultra-config?mac={MAC_DO_APARELHO}
```

O campo `mac` deve ser o MAC real do dispositivo. A API aceita o formato `AA:BB:CC:DD:EE:FF` ou o MAC sem separadores. O dispositivo precisa estar cadastrado no painel com o aplicativo **Ultra Player** e com status **Liberado**.

## Resposta esperada

```json
{
  "registered": true,
  "allowed": true,
  "mac": "AA:BB:CC:DD:EE:FF",
  "app_name": "Ultra Player",
  "impact_phrase": "",
  "message_title": "",
  "message_text": "",
  "server_api_url": "https://...",
  "apk_download_url": "https://.../ultra-player.apk",
  "apk_version": "1.0.0",
  "logo_url": "https://...",
  "banner_url": "https://...",
  "background_url": "https://...",
  "message_image_url": "https://...",
  "icons": {
    "live_tv": "https://...",
    "movies": "https://...",
    "series": "https://..."
  }
}
```

## Integração obrigatória dos botões

Depois de obter a resposta, o APK deve usar as URLs abaixo para carregar as imagens dos três botões da tela inicial:

| Botão no APK | Campo retornado pelo painel |
|---|---|
| **Canais** | `icons.live_tv` |
| **Filmes** | `icons.movies` |
| **Séries** | `icons.series` |

Exemplo de lógica:

```text
config = GET /api/v5/ultra-config?mac=MAC_DO_APARELHO

iconeCanais = config.icons.live_tv
iconeFilmes = config.icons.movies
iconeSeries = config.icons.series

Se a URL recebida não estiver vazia:
    baixar e aplicar a imagem no botão correspondente
Se a URL estiver vazia ou o download falhar:
    manter o ícone padrão que já existe no APK
```

O APK não deve deixar as URLs dos ícones fixas no código. O painel será usado para alterar as imagens sem necessidade de gerar uma nova versão do APK.

## Aplicação das demais configurações

| Campo | Onde usar no APK |
|---|---|
| `app_name` | Nome exibido do aplicativo. |
| `logo_url` | Logo/ícone principal. |
| `banner_url` | Banner da tela inicial. |
| `background_url` | Imagem de fundo da tela inicial. |
| `message_title`, `message_text`, `message_image_url` | Avisos e mensagens configuradas no painel. |
| `impact_phrase` | Texto de destaque na tela inicial. |
| `server_api_url` | URL da API de servidor definida no painel. |
| `apk_download_url`, `apk_version` | Atualização de aplicativo. |

## Regras de segurança e atualização

O APK deve fazer a consulta ao abrir o aplicativo e pode guardar a configuração em cache temporário. Se `registered` ou `allowed` vier como `false`, o aplicativo não deve iniciar a reprodução. Todas as chamadas devem usar HTTPS.

---

Depois de concluir a integração, envie uma versão de teste para validar se a troca de cada ícone pelo painel aparece no APK sem recompilação.
