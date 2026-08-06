/**
 * Tipos compartilhados (JSDoc) — Marketplace / Financeiro.
 * Espelham as entidades do backend. Não calcular regras financeiras neste arquivo.
 *
 * @typedef {'ADMIN'|'GUIDE'|'CURSOR'|'IMPORT'|'API'|'AI'} GcvCreatedBy
 * @typedef {'ADMINISTRATIVE'|'GUIDE_MARKETPLACE'} GcvBusinessMode
 * @typedef {'PAYOUT_PENDING'|'PAYOUT_PAID'|'PAYOUT_REVIEW'|'PAYOUT_BLOCKED'} GcvPayoutStatus
 * @typedef {'PENDING'|'PAID'|'CANCELLED'|'REFUNDED'|'DISPUTED'} GcvSaleStatus
 *
 * @typedef {Object} GcvPricingSnapshot
 * @property {number} guide_net_cents
 * @property {number} commission_pct
 * @property {number|null} commission_rule_id
 * @property {string} commission_scope
 * @property {number} commission_cents
 * @property {number} price_before_round_cents
 * @property {number} rounding_diff_cents
 * @property {number} final_price_cents
 *
 * @typedef {Object} GcvSaleSnapshot
 * @property {number} id
 * @property {string} reservation_id
 * @property {number} sold_price_cents
 * @property {number} guide_amount_cents
 * @property {number} platform_revenue_cents
 * @property {number} commission_pct_applied
 * @property {GcvBusinessMode} business_mode
 * @property {GcvCreatedBy} created_by_origin
 * @property {GcvSaleStatus} sale_status
 * @property {GcvPayoutStatus} payout_status
 * @property {string|null} guide_cpf
 * @property {string|null} guide_cnpj
 */

/* arquivo somente documental — não importar em runtime */
