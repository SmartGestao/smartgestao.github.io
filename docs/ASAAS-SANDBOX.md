# Integração Asaas — SmartGestão

Esta integração começa exclusivamente no ambiente Sandbox.

## Arquitetura

- A chave `ASAAS_API_KEY` fica somente nos Secrets do Supabase.
- `asaas-assinaturas` exige sessão Supabase válida e verifica se o usuário é owner/admin da empresa.
- O preço e a periodicidade são definidos no servidor: R$ 39,90 por mês.
- `asaas-webhook` valida o cabeçalho `asaas-access-token` usando o Secret `ASAAS_WEBHOOK_TOKEN`.
- O acesso só deve ser considerado ativo após `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`.
- A migração cria tabelas isoladas para o vínculo de assinaturas e a idempotência dos webhooks; não altera tabelas operacionais existentes.

## Secrets no Supabase

Já configurado pelo responsável:
- `ASAAS_API_KEY`: chave privada da conta Sandbox.

Ainda será necessário criar:
- `ASAAS_WEBHOOK_TOKEN`: token aleatório exclusivo para autenticar notificações. Não reutilizar a chave da API.

## Deploy

1. Aplicar a migração `202611200001_asaas_assinaturas.sql` no SQL Editor do projeto Supabase.
2. Publicar a Edge Function `asaas-assinaturas`.
3. Publicar a Edge Function `asaas-webhook` com verificação JWT desativada (a autenticação é feita pelo token próprio do webhook).
4. Configurar no painel Asaas Sandbox um webhook apontando para:
   `https://jilvfsmornkpxbtxetrp.supabase.co/functions/v1/asaas-webhook`
5. Configurar no webhook Asaas o mesmo valor guardado em `ASAAS_WEBHOOK_TOKEN`, no campo de token de autenticação.
6. Selecionar eventos de pagamento e assinatura, incluindo `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_INACTIVATED` e `SUBSCRIPTION_DELETED`.

## Observações

- Sandbox não movimenta dinheiro real e tem credenciais e dados separados da Produção.
- A criação da assinatura não significa que houve pagamento.
- A interface do cliente ainda precisa chamar a função e apresentar o link de pagamento; não habilitar cobrança real antes dos testes ponta a ponta.
- Nunca colocar a chave Asaas ou a service role key no GitHub, no navegador ou em arquivos públicos.
