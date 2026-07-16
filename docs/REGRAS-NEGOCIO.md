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
| Preço | Guia, admin ou cliente (ao propor) define **valor por pessoa** |
| Guia na excursão | Admin **deve** atribuir guia para publicar |

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
- **Publicar** passeio: escolhe atrativo já cadastrado pelo admin, data, hora, embarque, vagas, **preço/pessoa**, quórum ≥ 4.
- Sem atingir quórum → permanece **em formação** (não “confirmada”).
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

## APIs principais

| Endpoint | Papel |
|----------|--------|
| `GET/PUT /api/guides/me-profile.php` | Perfil guia |
| `GET/POST/PUT /api/guides/excursions.php` | Agenda / publicar / cancelar |
| `POST /api/guides/media-upload.php` | Upload docs/foto |
| `GET/PUT /api/client/profile.php` | Perfil cliente |
| `GET/POST /api/client/excursions.php` | Propor excursão (preço/pessoa) |
| `GET /api/bookings/my.php` | Reservas + lifecycle |
| `POST /api/bookings/cancel.php` | Cancelar (sem ressarc. se confirmada) |

---

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
