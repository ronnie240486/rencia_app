# Informações do APK NuvixTVXC_v2

## Problema Encontrado
- O APK tem um botão com `android:onClick="showdialog"` no arquivo `res/layout/activity_login.xml`
- Quando clicado, tenta executar o método `showdialog()` que não existe na Activity
- Isso causa: `java.lang.IllegalStateException: Could not execute method for android:onClick`

## Localização do Erro
- Arquivo: `res/layout/activity_login.xml`
- Elemento: `<Button android:id="@id/dnsmenu" android:onClick="showdialog" />`

## Configurações Corretas
- `panelURL`: `https://renciaapp.manus.space/api/`
- `dnsConfigUrl`: `https://renciaapp.manus.space/api/nuvix/config/`
- `dynamicDNS`: true

## Solução
Precisa recompilar o APK com o método `showdialog()` implementado corretamente na Activity principal.

## Endpoint de Configuração
GET `https://renciaapp.manus.space/api/nuvix/config/1`

Retorna:
```json
{
  "success": true,
  "dns": [
    {"nome": "Casa", "url": "sl1nk.com/nuvix-xc"}
  ],
  "backgroundUrl": "",
  "iconUrl": "",
  "appName": "NUVIX",
  "buttonColor": "#000000"
}
```
