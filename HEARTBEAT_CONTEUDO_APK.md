# Atualização do conteúdo assistido no APK

O APK deve manter o conteúdo exibido no painel enviando um heartbeat enquanto o usuário estiver assistindo ao mesmo canal, filme ou série.

## Rota

```text
GET https://renciaapp.manus.space/api/v5/heartbeat?mac={MAC_DO_APARELHO}&current_content={NOME_DO_CONTEUDO}
```

O APK deve chamar essa rota ao iniciar a reprodução, ao trocar de conteúdo e novamente a cada **60 segundos** enquanto a reprodução estiver ativa. O mesmo valor de `current_content` pode ser enviado repetidamente; isso atualiza a conexão sem apagar o que está sendo assistido.

Quando for preciso apenas manter o aparelho online, sem alterar o conteúdo exibido, o APK pode chamar:

```text
GET https://renciaapp.manus.space/api/v5/heartbeat?mac={MAC_DO_APARELHO}
```

O painel preserva o último conteúdo conhecido se o heartbeat não trouxer um nome novo. O APK não deve enviar `current_content` vazio para limpar o conteúdo ao continuar assistindo.

## Exemplo de implementação

```text
ao iniciar ou trocar de conteúdo:
    enviar heartbeat com MAC e nome do canal, filme ou série

a cada 60 segundos enquanto o player estiver em reprodução:
    enviar o mesmo heartbeat com MAC e nome do conteúdo atual

ao pausar temporariamente:
    manter o último conteúdo; não enviar valor vazio
```
