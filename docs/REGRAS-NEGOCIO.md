# Regras de negócio — Guia Chapada Veadeiros

Espelhadas do Navi-Experience e adaptadas ao site (carrossel CMS + dashboard).  
Triangulação: **Admin ↔ Guia ↔ Cliente**.

## Constantes

| Regra | Valor |
|--------|--------|
| Quórum mínimo | **4 pessoas** |
| Status dinâmico | `em_formacao` se inscritos &lt; quórum; `confirmada` se ≥ quórum; `concluida` se data passada e teve quórum; `cancelada` se cancelada |
| Cidades-base do guia | Alto Paraíso, São Jorge, Cavalcante |
| Bio / descrição | recomendado **até 600** caracteres; máximo **800** |
| Cancelamento (cliente) | Em formação: pode cancelar. Confirmada: **sem ressarcimento** no fluxo atual |
| Cancelamento (guia) | Pode cancelar passeio **ainda não realizado** (data futura) |
| Preço | Depende do **BusinessMode** (nunca de CreatedBy) |
| ADMINISTRATIVE | Admin define preço final + repasse previsto ao guia; publica na hora |
| GUIDE_MARKETPLACE | Guia informa só o **líquido desejado**; backend calcula comissão (padrão 16%) + arredondamento comercial; status `pending_approval` |
| Guia na excursão | Admin **deve** atribuir guia para publicar |
| Repasse | Manual (PIX) nesta versão; automático Sicoob preparado (`payout_delay_hours=6`) |
| Auditoria | CreatedBy = ADMIN/GUIDE/CURSOR/IMPORT/API/AI — só auditoria |

---

## Admin

| Pode | Não pode (sem fluxo) |
|------|----------------------|
| Cadastrar atrativos, cidades, revista | Criar conta admin via Google |
| Aprovar/rejeitar guias | — |
| CRUD excursões e **obrigar guia** ao publicar | — |
| Definir/alterar guia de um passeio | — |
| Ver todas as reservas, financeiro, PIX guias | — |
| Cancelar excursão (motivo: clima / quórum / outro) | — |

---

## Guia

### Perfil (obrigatórios)

| Campo | Tipo | Limite |
|-------|------|--------|
| Nome completo | texto | 2–160 |
| Apelido | texto | 2–80 |
| E-mail | e-mail (conta) | — |
| CPF | dígitos | 11 |
| PIX | texto | 5–120 |
| Tipo chave PIX | enum | cpf, cnpj, email, phone, random |
| Telefone | DDI + DDD + número | DDI padrão +55 |
| Data nascimento | date | ≥ 18 anos |
| Documento identificação | arquivo | JPG/PNG/WEBP/PDF ≤ 8 MB |
| Cidade | enum/base | Alto Paraíso / São Jorge / Cavalcante |
| Foto 3×4 | imagem | ≤ 8 MB |
| Descrição | texto | max 800 (ideal ≤ 600) |

### Agenda / passeios

- Ver **próximas saídas** em que é o guia (destaque: confirmadas vs em formação).
- **Publicar** passeio (marketplace): escolhe atrativo cadastrado pelo admin, data, hora, embarque, vagas, **valor líquido desejado**, quórum ≥ 4 → fica `pending_approval` até o admin aprovar.
- Cadastro financeiro obrigatório (CPF/CNPJ + PIX) para receber repasse.
- Sem atingir quórum (após publicado) → permanece **em formação**.
- **Cancelar** passeio futuro ainda não realizado.
- Não altera atrativos do catálogo (só escolhe).

---

## Cliente

| Pode | Regra |
|------|--------|
| Ver próximos passeios / reservas | Painel (home do cliente) |
| Cancelar reserva | Em formação: pode cancelar (com regra de reembolso se aplicável). Confirmada: **sem ressarcimento** |
| Editar perfil | Nome, telefone (DDI), CPF, nascimento |
| Propor excursão | Escolhe atrativo do catálogo + **valor por pessoa**; fica `draft` até o admin atribuir guia e publicar |
| Pagar Pix no site | Fluxo atual do carrossel |

## Campos do perfil do guia (tipos e limites)

| Campo | Tipo | Limite / regra |
|-------|------|----------------|
| Nome completo | string | 2–160, obrigatório |
| Apelido | string | 2–80, obrigatório |
| E-mail | e-mail | da conta (não editável no form) |
| CPF | dígitos | exatamente 11 |
| PIX | string | 1–120 |
| Tipo PIX | enum | `cpf` \| `cnpj` \| `email` \| `phone` \| `random` |
| Telefone | DDI + dígitos | DDI ≤8; número 10–13 dígitos |
| Nascimento | date `Y-m-d` | ≥ 18 anos |
| Documento ID | URL arquivo | JPG/PNG/WEBP/PDF ≤ 8 MB |
| Cidade | FK cidade | Alto Paraíso / São Jorge / Cavalcante |
| Foto 3×4 | URL imagem | ≤ 8 MB |
| Descrição | texto | **recomendado ≤ 600**; **máximo 800** |

## Tarifário e passeios do dia

- **Passeio** = o que o cliente faz num dia. É **1 item do carrinho** e tem de **1 até N atrativos** (N = Configurações → `passeio_max_atrativos`, padrão 3).
- **Carrinho:** nunca 2 itens com a mesma data. Tentar adicionar mostra o aviso e não entra. Se o navegador já tiver 2 na mesma data, fica só o primeiro e o aviso aparece.
- **Tarifário** = tabela de preço por pessoa, por cidade de saída (Alto Paraíso, São Jorge, Cavalcante) × modalidade (excursão, privativo) × transporte (sem, com translado). Também guarda o mínimo de pessoas cobrado no privativo (quórum, padrão 4).
- Cada **atrativo** tem **1 tarifário**. Cada **passeio com 2+ atrativos** tem **1 tarifário próprio**: o preço de atrativos juntos **nunca é a soma**.
- Um tarifário pode ser usado por **vários** atrativos e passeios.
- **Sem tarifário, não vende:** o atrativo some do widget e o passeio do mesmo dia não aparece como opção.
- **Duração** é do passeio (não do tarifário) e muda conforme a cidade de saída. Cidade sem valor usa a duração geral do atrativo/passeio.
- Um passeio com 2+ atrativos aparece na página de **todos** os atrativos dele (ligar A com B atualiza A e B).
- Excluir um tarifário solta quem usava: ficam fora da venda até ligar outro.
- Carga inicial: `api/data/tarifarios-seed.json` (só roda com a tabela `gcv_tarifario` vazia e atrativos já importados). Os passeios com 2+ atrativos vieram com preço **sugerido** (soma dos atrativos − 10%) para revisar.
- Tabelas: `gcv_tarifario`; colunas `tarifario_id` e `duracao_json` em `gcv_attractions` e `gcv_passeio_relacionado`. Criadas sozinhas pelo `gcv_cms_ensure_schema()` (sem migration manual).

## APIs principais

| Endpoint | Papel |
|----------|--------|
| `GET/PUT /api/guides/me-profile.php` | Perfil guia |
| `GET/POST/PUT /api/guides/excursions.php` | Agenda / publicar (marketplace) / cancelar |
| `GET /api/guides/pricing-preview.php` | Preview de preço (cálculo só no backend) |
| `GET/PUT /api/guides/financial-profile.php` | Perfil financeiro do guia |
| `GET/POST /api/admin/excursion-approvals.php` | Aprovar / rejeitar / solicitar alterações |
| `GET /api/admin/finance-dashboard.php` | Dashboard financeiro + export CSV/XLSX/PDF |
| Ver também | `docs/MARKETPLACE-FINANCEIRO.md` |
| `POST /api/guides/media-upload.php` | Upload docs/foto |
| `GET/PUT /api/client/profile.php` | Perfil cliente |
| `GET/POST /api/client/excursions.php` | Propor excursão (preço/pessoa) |
| `GET /api/bookings/my.php` | Reservas + lifecycle |
| `POST /api/bookings/cancel.php` | Cancelar (sem ressarc. se confirmada) |

---

- `GET /api/passeios.php?slug=` — widget da página do atrativo (preço do Tarifário, duração por cidade, passeios do mesmo dia)
- `GET /api/passeios.php` — catálogo da página Passeios
- `/api/admin/tarifarios.php` — menu Tarifário (GET visão geral; POST/PUT tarifário; PUT `action` = `link`, `duracao`, `combo`; DELETE tarifário ou passeio)

## Máquina de status da saída

```
draft → published (com guia)
         ├─ inscritos < quorum  → em_formacao
         ├─ inscritos ≥ quorum  → confirmada
         ├─ data passada + teve quórum → concluida
         └─ cancel → cancelada
```

## Fluxo resumido

```
Admin cadastra atrativo
    → Guia (ativo, perfil completo) publica saída (preço/pessoa, quorum≥4)
      OU Cliente propõe (preço/pessoa) → Admin atribui guia e publica
    → Cliente reserva (Pix)
    → Quórum sobe → status confirmada
    → Guia/Admin/Cliente cancelam conforme regras acima
```
