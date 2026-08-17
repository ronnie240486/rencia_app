# Configuração e registro de teste no painel

## 1. Buscar a configuração no painel

O Maximus deve buscar primeiro a configuração atual pelo MAC. Esta é a única rota que entrega a URL cadastrada no campo **API do Servidor** do painel:

```text
GET https://renciaapp.manus.space/api/v5/check_mac.php?mac={MAC_DO_APARELHO}
```

Exemplo de parte relevante da resposta:

```json
{
  "success": true,
  "mac": "AA:BB:CC:DD:EE:FF",
  "dns_url": "https://painelepic.lat/api/chatbot/..."
}
```

`dns_url` é a URL da API externa de provisionamento/teste. O APK não deve fazer `GET` direto nela para descobrir a configuração: ela aceita o próprio contrato `POST` do fornecedor.

## 2. Registrar o teste concluído no painel

Depois que a API externa concluir o teste e devolver os dados informados pelo cliente, o Maximus deve chamar a função `registerCompletedTest` já disponível em `src/api/client.ts`.

```ts
await registerCompletedTest({
  mac: getDeviceMac(),
  name: resultado.name,
  phone: resultado.phone,
});
```

O painel recebe o resultado em `POST /api/v5/maximus-test-result`. Para um MAC novo, cria um cliente bloqueado com o nome `Nome (teste)`. Caso o mesmo MAC repita o envio, atualiza o mesmo registro de teste em vez de criar uma duplicação. Um cliente real com o mesmo MAC nunca é alterado por essa rota.
