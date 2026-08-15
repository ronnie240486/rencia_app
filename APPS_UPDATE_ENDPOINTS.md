# Atualização Separada dos Aplicativos

Cada aplicativo consulta **somente sua própria URL de atualização**. Alterar uma URL no painel não muda a atualização dos outros aplicativos.

| Aplicativo | Campo no painel | Endpoint do APK |
|---|---|---|
| OuroPro | Configurações do App → APK → URL do APK | `GET /api/v4/update.php` |
| Ultra Player | Ultra Player → URL de atualização do Ultra Player | `GET /api/v5/ultra-update?mac={MAC}` |
| Maximus | Maximus → URL de atualização do Maximus | `GET /api/v5/maximus-update?mac={MAC}` |

As duas rotas por MAC validam se o aparelho pertence ao aplicativo correto antes de devolver a URL. A resposta inclui `url`, `apk_link`, `version` e `update_available`.
