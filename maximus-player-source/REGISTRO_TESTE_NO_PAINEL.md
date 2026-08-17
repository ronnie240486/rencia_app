# Registro de teste concluído no painel

Depois que a API externa concluir o teste e devolver os dados informados pelo cliente, o Maximus deve chamar a função `registerCompletedTest` já disponível em `src/api/client.ts`.

```ts
await registerCompletedTest({
  mac: getDeviceMac(),
  name: resultado.name,
  phone: resultado.phone,
});
```

O painel recebe o resultado em `POST /api/v5/maximus-test-result`. Para um MAC novo, cria um cliente bloqueado com o nome `Nome (teste)`. Caso o mesmo MAC repita o envio, atualiza o mesmo registro de teste em vez de criar uma duplicação. Um cliente real com o mesmo MAC nunca é alterado por essa rota.
