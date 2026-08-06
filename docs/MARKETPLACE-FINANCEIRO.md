# Marketplace, Publicação e Financeiro

Arquitetura centralizada no **backend PHP/MySQL** (sem cálculo financeiro no frontend).  
Stack real do projeto: PDO + SQL versionado em `api/database/` + auto-schema em runtime.  
Não há Prisma neste repositório; o equivalente é `migration_marketplace_financeiro.sql` + `gcv_marketplace_ensure_schema()`.

## Princípios

| Campo | Uso |
|--------|-----|
| **CreatedBy** (`created_by_origin`) | Auditoria apenas: `ADMIN`, `GUIDE`, `CURSOR`, `IMPORT`, `API`, `AI` |
| **BusinessMode** (`business_mode`) | Regras financeiras: `ADMINISTRATIVE` \| `GUIDE_MARKETPLACE` |

Nunca usar `CreatedBy` para preço/comissão/repasse.

## Entidades

- `gcv_commission_rules` — comissão por escopo (prioridade: excursão → guia → categoria → cidade → global; padrão 16%)
- `gcv_excursions` — campos financeiros + `pending_approval` / `rejected`
- `gcv_sales` — snapshot imutável por venda
- `gcv_pix_payments` — PIX recebido na conta PJ (TxID, EndToEndId, chave, status)
- `gcv_sale_payouts` — repasse ao guia (manual agora; stub Sicoob futuro)
- `gcv_guide_financial` — perfil financeiro obrigatório
- `gcv_audit_log` — auditoria imutável (campo, old/new, user, IP, origem)
- `gcv_settings.payout_delay_hours` — default **6** (prep. automático)

## Serviços (única fonte de verdade)

| Serviço | Arquivo |
|---------|---------|
| Comissão | `api/helpers/marketplace/commission_service.php` |
| Pricing + arredondamento | `api/helpers/marketplace/pricing_service.php` |
| Publicação | `api/helpers/marketplace/publish_service.php` |
| Vendas / snapshot | `api/helpers/marketplace/sale_service.php` |
| Repasse | `api/helpers/marketplace/payout_service.php` |
| Dashboard / contábil | `api/helpers/marketplace/finance_dashboard_service.php` |
| Perfil financeiro guia | `api/helpers/marketplace/guide_financial_service.php` |
| Auditoria | `api/helpers/marketplace/audit_service.php` |

### Arredondamento comercial

Após `valorGuia + comissão`:

1. Eliminar centavos (`ceil` para reais inteiros)
2. Subir até o menor inteiro ≥ valor divisível por **5 ou 8**

Exemplos: `212,28 → 215` · `232,00 → 232` · `238,20 → 240`

Persistido em: `guide_net_cents`, `commission_pct_applied`, `commission_cents`, `price_before_round_cents`, `rounding_diff_cents`, `price_cents`.

## Modos de publicação

### ADMINISTRATIVE

- Origens: ADMIN, CURSOR, IMPORT, API, AI
- Publica imediatamente (quando `status=published`)
- Admin define preço final + repasse previsto ao guia
- Margem da plataforma registrada
- Sem taxa automática obrigatória além do que o admin definir

### GUIDE_MARKETPLACE

- Guia informa só `guide_net_cents`
- Backend resolve comissão, calcula preço, arredonda
- Status: `pending_approval` (nunca publica sozinho)
- E-mail para `diegonavi82@gmail.com`
- Admin: Aprovar / Rejeitar / Solicitar alterações / Editar e Aprovar

## APIs

| Método | Endpoint | Papel |
|--------|----------|--------|
| GET/POST | `/api/admin/excursion-approvals.php` | Admin aprovações |
| GET/POST/PUT/DELETE | `/api/admin/commission-rules.php` | Regras de comissão |
| GET | `/api/admin/finance-dashboard.php` | Dashboard + export `csv\|xlsx\|pdf` |
| GET | `/api/admin/financial.php` | Compat legado + dashboard |
| GET/POST | `/api/admin/sale-payouts.php` | REGISTRAR REPASSE PIX |
| POST/PUT | `/api/admin/excursions.php` | Publicação administrativa |
| GET/POST | `/api/guides/excursions.php` | Publicação marketplace (pending) |
| GET | `/api/guides/pricing-preview.php` | Preview de preço (só backend) |
| GET/PUT | `/api/guides/financial-profile.php` | Cadastro financeiro do guia |

### Exportações

`GET /api/admin/finance-dashboard.php?export=csv&accounting=1&from=&to=&guide_user_id=&cpf=&cnpj=&business_mode=&origin=`

Filtros: período, guia, CPF, CNPJ, passeio, cidade, status, origem (CreatedBy), BusinessMode.

## Vendas e PIX

Ao confirmar PIX (`gcv_pix_mark_paid`), o backend cria/atualiza:

1. `gcv_sales` (snapshot: preço, guia, plataforma, comissão, BusinessMode, CreatedBy, CPF/CNPJ, cidade…)
2. `gcv_pix_payments` (TxID, EndToEndId, valor, chave, data/hora, status)

Vendas antigas **não** mudam se o preço da excursão mudar depois.

## Repasse

- Versão atual: **manual** (`action=register_pix`)
- Status: `PAYOUT_PENDING` \| `PAYOUT_PAID` \| `PAYOUT_REVIEW` \| `PAYOUT_BLOCKED`
- Nunca excluir (soft-delete apenas se necessário)
- Bloqueia sem chave PIX no perfil financeiro
- Idempotência por `idempotency_key` / `end_to_end_id`

### Futuro automático (Sicoob) — preparado, NÃO habilitado

`scheduledPayoutAt = início_da_excursão + payoutDelayHours` (default 6h)

Validações em `gcv_payout_auto_eligibility()`:

- pagamento confirmado · excursão realizada · reserva ativa · excursão ativa · guia ativo · PIX válido · sem bloqueio/disputa/estorno · repasse ainda não feito

`gcv_payout_auto_execute_stub()` retorna sempre `executed: false`.

## Contabilidade / NF futura

`gcv_finance_accounting_report()` já exporta CPF/CNPJ, nome, bruto, líquido guia, receita plataforma, comissão, datas, TxID, EndToEndId, status, BusinessMode, CreatedBy — sem remodelar o banco depois.

## Migração

1. Importar `api/database/migration_marketplace_financeiro.sql` no phpMyAdmin **ou**
2. Deixar o auto-schema (`gcv_marketplace_ensure_schema`) rodar no primeiro request admin/CMS/guia

## UI

- Admin → **Aprovações**, **Comissões**, **Financeiro** (métricas + export + REGISTRAR REPASSE PIX)
- Guia → publica com valor líquido + preview servidor; **Dados financeiros**
