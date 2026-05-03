# Rencia App — Backend & API

## Visão Geral

Este projeto é um painel administrativo completo para gerenciamento de devices (usuários de IPTV), com backend Node.js/Express + tRPC + MySQL e frontend React.

O backend expõe uma **API REST pública** que o APK pode consumir para verificar se um device (MAC) está cadastrado e liberado.

---

## Como Funciona

```
APK (Android)
    │
    │  GET /api/device/check?mac=XX:XX:XX:XX:XX:XX
    ▼
Backend (Node.js + Express)
    │
    │  Consulta banco MySQL
    ▼
Retorna: { found, allowed, status, urlM3u8, app, ... }
```

**Fluxo completo:**
1. Você cadastra um device no painel em `/users/create`
2. O APK faz uma requisição GET para `/api/device/check?mac=<MAC_DO_DISPOSITIVO>`
3. O backend retorna se o device está **Liberado**, **Bloqueado** ou **Expirado**
4. O APK usa os dados retornados (URL M3U8, app, etc.) para configurar o player

---

## API REST — Endpoints Públicos

### `GET /api/device/check?mac=XX:XX:XX:XX:XX:XX`

Verifica se um device está cadastrado e retorna seus dados.

**Exemplo de chamada:**
```
GET https://renciaapp-ldyffp73.manus.space/api/device/check?mac=00:1A:2B:3C:4D:5E
```

**Resposta — Device Liberado:**
```json
{
  "found": true,
  "status": "Liberado",
  "allowed": true,
  "mac": "00:1A:2B:3C:4D:5E",
  "nomeServer": "Servidor Principal",
  "tipo": "Usuario",
  "app": "IPTV Smarters",
  "urlM3u8": "http://servidor.com/lista.m3u8",
  "urlEpg": "http://servidor.com/epg.xml",
  "modoSelecao": "M3U8",
  "dataExpiracao": "2025-12-31T00:00:00.000Z",
  "dataCadastro": "2025-01-01T00:00:00.000Z"
}
```

**Resposta — Device Não Cadastrado:**
```json
{
  "found": false,
  "allowed": false,
  "message": "Device não cadastrado."
}
```

**Resposta — Device Bloqueado/Expirado:**
```json
{
  "found": true,
  "status": "Expirado",
  "allowed": false,
  ...
}
```

### `GET /api/health`

Health check — confirma que o servidor está rodando.

```json
{ "status": "ok", "timestamp": "2026-05-03T00:00:00.000Z" }
```

---

## Como Integrar no APK

No código do APK (Smali ou Java/Kotlin), substitua a URL base do servidor pela URL do seu painel publicado.

**Exemplo em Java/Kotlin:**
```kotlin
val BASE_URL = "https://renciaapp-ldyffp73.manus.space"
val mac = getMacAddress() // função que pega o MAC do dispositivo

val url = "$BASE_URL/api/device/check?mac=$mac"
// Faça a requisição HTTP GET e processe o JSON retornado
// Se "allowed" == true → libera acesso
// Se "allowed" == false → bloqueia e mostra mensagem
```

---

## Painel Administrativo

Acesse o painel em: **https://renciaapp-ldyffp73.manus.space**

| Funcionalidade | Descrição |
|---|---|
| Dashboard | Stats de devices, plano, top apps, últimos cadastros |
| Usuários | Lista completa com busca, filtros e ações em massa |
| Cadastrar Usuário | Formulário com MAC, nome, app, URL M3U8, expiração |
| Perfil | Dados do usuário autenticado |

---

## Instalação Local (Desenvolvimento)

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais de banco de dados

# 3. Rodar migrations do banco
pnpm drizzle-kit migrate

# 4. Iniciar servidor de desenvolvimento
pnpm dev
```

**Variáveis de ambiente necessárias:**
```env
DATABASE_URL=mysql://usuario:senha@host:3306/banco
JWT_SECRET=sua_chave_secreta_aqui
```

---

## Estrutura do Projeto

```
server/
  apiRoutes.ts      ← API REST pública (endpoints para o APK)
  routers.ts        ← Procedures tRPC (painel administrativo)
  db.ts             ← Helpers de banco de dados
  _core/            ← Infraestrutura (OAuth, Express, cookies)
drizzle/
  schema.ts         ← Schema do banco de dados (tabelas devices, apps, users)
client/
  src/pages/        ← Páginas do painel (Dashboard, Users, Profile)
  src/components/   ← Componentes reutilizáveis (AdminLayout, etc.)
```

---

## Tecnologias

- **Backend:** Node.js, Express, tRPC
- **Banco de dados:** MySQL (via Drizzle ORM)
- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui
- **Autenticação:** OAuth (Manus)
