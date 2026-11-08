# Pagamentos — Pix, cartão nacional (Mercado Pago) e internacional (Stripe)

> Status: **em desenvolvimento** (deploy pausado). Nada disto está no ar até o dono liberar.

## Formas de pagamento e preço

| Forma | Plataforma | Preço | Parcelas | Quando cobra |
|---|---|---|---|---|
| Pix | Sicoob | valor do tarifário | — | na hora |
| Cartão nacional | Mercado Pago (formulário embutido) | +15% (`PAY_CARD_BR_PCT`) | até 4x sem juros | só quando o passeio confirma |
| Cartão internacional | Stripe (USD) | +25% (`PAY_CARD_INTL_PCT`) convertido pela PTAX do dia + 4% (`PAY_FX_SPREAD_PCT`) | 1x | só quando o passeio confirma |

- O preço de cada forma é calculado **no servidor** (`api/helpers/payments/pricing.php`). O navegador só exibe (`GET /api/payment_quote.php`).
- O valor base enviado pelo navegador é conferido contra `gcv_excursions` (`base_amount.php`). Divergência: recusa (`PAY_STRICT_PRICE_CHECK=1`) ou marca a venda para revisão (padrão).
- "Sem juros" no Mercado Pago depende da configuração da conta (parcelamento sem acréscimo até 4x). O código limita o máximo de parcelas.
- Diferenciar preço por forma de pagamento é permitido (Lei 13.455/2017).

## Checkout (site)

Botões no modal de pagamento, ordem por idioma: PT → Pix, nacional, internacional; EN/ES → internacional em destaque.
Cartão nacional abre o **Card Payment Brick** do Mercado Pago dentro do modal (sem redirecionar). Internacional abre o Stripe Checkout.
Sem `MP_PUBLIC_KEY` no localhost aparece "Simular cartão aprovado" (só `npm run dev`).

## Pré-autorização ("só cobrar quando confirmado com guia")

Estados da reserva (`api/storage/pix_reservations/{id}.json`):

```
PENDING ──► CARD_SAVED ──► AUTHORIZED ──► PAID (capturado)
                │               │
                └──────┬────────┘
                       ▼
                   RELEASED (nada cobrado)
```

- **AUTHORIZED**: valor reservado no cartão, não cobrado. A vaga conta no quórum (`gcv_sales.sale_status = AUTHORIZED`), mas **não** gera repasse ao guia.
- A reserva no cartão vence (Stripe 7 dias, MP 5 dias). Por isso:
  - Passeio em até `PAY_MP_AUTH_DAYS` (4) / `PAY_STRIPE_AUTH_DAYS` (6) dias → reserva na hora.
  - Mais longe → **CARD_SAVED** (cartão salvo na plataforma). Na janela: Stripe reserva sozinho (off-session); Mercado Pago envia e-mail com link `confirmar-cartao.html` para o cliente digitar o CVV.
  - Cliente que não confirma até `PAY_CARD_CONFIRM_DEADLINE_HOURS` (48h) antes → vaga liberada.
- **Cobrança (captura)**: cada passeio da reserva (`gcv_booking_trips`) vira CONFIRMED quando a excursão está "confirmada" (quórum) **e** o guia confirmou a reserva no painel. Passeio sem excursão/quórum (privativo): basta o guia/admin confirmar.
- **Liberação**: excursão cancelada, ou `PAY_DECISION_HOURS` (12h) antes da saída sem confirmar → cartão liberado, vagas devolvidas, venda CANCELLED.
- Carrinho com vários dias: captura parcial da parte confirmada. Se a reserva no cartão for vencer antes de decidir todos, cobra os confirmados e libera o resto (admin é avisado).
- E-mails ao cliente: vaga reservada, confirme o cartão, passeio confirmado (cobrado), passeio não confirmado (nada cobrado).
- Guia: painel → **Confirmar reservas**. Admin: Financeiro → **Reservas para confirmar** (confirma em nome do guia). Alerta ao admin `PAY_GUIDE_ALERT_HOURS` (24h) antes se o guia não confirmou.

Código: `api/helpers/payments/authorization.php` (regras), `stripe_auth.php`, `mercadopago_api.php`, endpoints `api/mp_card.php`, `api/card_action.php`, `api/guides/booking-confirmations.php`.

## Dinheiro: plataformas → Sicoob → guias

1. **Stripe → Sicoob**: repasse automático (painel Stripe → Configurações → Repasses: diário, conta Sicoob). O webhook `payout.*` liga cada cobrança ao repasse.
2. **Mercado Pago → Sicoob**: o cron (`mp_sweep.php`, a cada 15 min) envia por Pix o líquido das vendas de cartão nacional já liberadas, pela API de Payouts. Exige o produto Payouts ativo e `MP_PAYOUT_PRIVATE_KEY` (Ed25519). Quando o Pix aparece no Sicoob, as vendas passam a "no Sicoob". Se o Payouts não estiver ativo, o admin transfere pelo app e o extrato (CNPJ `PAY_OWN_CNPJ` ou nome Mercado Pago) concilia sozinho. Resumo diário por e-mail se ainda restar saldo.
3. **Sicoob → guia**: Pix automático no dia do passeio, às 16:20, só da parte do guia. O restante fica no Sicoob. Cartão só depois de capturado e com o dinheiro já no Sicoob. Estorno ou contestação seguram o repasse.

## Registro de transações

`gcv_payment_transactions` (uma linha por reserva × plataforma): bruto, acréscimo, taxa real da plataforma (API: `balance_transaction` na Stripe, `net_received_amount` no MP), líquido, quando libera, se já chegou no Sicoob. `gcv_gateway_settlements`: repasses plataforma → Sicoob.
Painel: Financeiro → **Transações de pagamento** (filtros + CSV). Endpoint: `api/admin/payment-ledger.php`.

## Segurança

- Preço recalculado no servidor; valor e moeda conferidos antes de confirmar qualquer pagamento.
- Dados do cartão nunca passam pelo servidor (Brick do MP e Stripe Checkout tokenizam).
- Webhooks com assinatura: Stripe (`STRIPE_WEBHOOK_SECRET`), Mercado Pago (`MP_WEBHOOK_SECRET`). O webhook do MP também consulta o pagamento na API.
- Stripe: 3D Secure solicitado sempre (`request_three_d_secure=any`) e Radar. Apple Pay/Google Pay aparecem no Checkout quando ativados no painel.
- Limite de tentativas por IP nos endpoints de cartão (`rate_limit.php`).
- Link "confirmar cartão" assinado com HMAC (`APP_SECRET`).
- Estorno/contestação: venda marcada, repasse ao guia segurado, admin avisado por e-mail.

## Configuração para publicar

1. `api/.env`: `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` (produção), `MP_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `APP_SECRET`, `APP_URL` (ver `.env.example`).
2. Mercado Pago: aplicação "Guia Chapada Veadeiros" (ID 6071222836069347), Checkout Transparente; Webhooks → `https://www.guiachapadaveadeiros.com/api/mp_webhook.php` (Pagamentos, Contestações); conta com parcelamento sem acréscimo até 4x.
3. Stripe: webhook `https://www.guiachapadaveadeiros.com/api/stripe_webhook.php` com os eventos listados no arquivo; repasses diários para a conta Sicoob; Radar e carteiras (Apple/Google Pay).
4. Cron (Hostinger, a cada 15 min): `api/cron/reconcile-payments.php?secret=…` junto com `auto-payouts.php`.
5. Tabelas novas são criadas sozinhas (`gcv_ledger_ensure_schema`, `gcv_auth_ensure_schema`) ou via `api/database/migration_payment_ledger.sql`.
