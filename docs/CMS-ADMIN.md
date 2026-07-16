# CMS Admin — Guia Chapada Veadeiros

## Logins separados (3 portas)

| Perfil | URL | Google | Notas |
|--------|-----|--------|--------|
| Cliente | `/login.html` | Sim (`?context=client`) | Público |
| Guia | `/guia/login.html` | Sim (`?context=guide`) | Público, fluxo CADASTUR |
| Admin | `/admin/login.html` | Sim (`?context=admin`) | **Não linkado no site** — só conta admin já existente |

Painel após login: `/dashboard/`

Google OAuth:
- Cliente novo → cria conta `client` ativa
- Guia novo → cria conta `guide` pendente + avisa admin
- Admin → **não cria** conta; só entra se o e-mail Google já for `role=admin`

Admin padrão: `diegocsp82@gmail.com`  
No MySQL (phpMyAdmin): rode `api/database/ensure_admin.sql`  
Ou no servidor: `php tools/ensure-admin.php 'SuaSenhaForte'`

## Deploy MySQL (Hostinger)

1. `api/database/migrations.sql` (base)
2. `api/database/migration_cms.sql` **ou** deixe a auto-migração criar as tabelas no 1º acesso às APIs CMS
3. Importe o conteúdo existente:

```bash
php tools/import-cms-seed.php
```

Isso importa revista (`revista/*.html`), atrativos (`tools/cms-generated.json` + galleries), guias seed e excursões (`tools/excursoes-carousel-seed.json`).

## Como ficam as imagens?

| O quê | Onde |
|-------|------|
| Arquivo | Disco: `assets/img/uploads/{revista\|atrativos\|guias\|geral}/YYYY/MM/arquivo.webp` |
| Metadados | Tabela `gcv_media` (url, mime, bytes, pasta, quem enviou) |
| URL pública | `/assets/img/uploads/...` (servida como asset estático) |
| Limite | 8 MB — JPG, PNG, WEBP, GIF, PDF |

No admin, cada formulário tem upload (capa, galeria, diploma, foto 3x4). Em produção a pasta `assets/img/uploads` precisa de permissão de escrita pelo PHP.

Imagens antigas do site (`/assets/img/imagens/...`) continuam onde estão; o import só referencia as URLs existentes.

## Google Places (autocomplete de cidades)

1. [Google Cloud Console](https://console.cloud.google.com/) → ative **Places API (New)**
2. Crie uma API key (restrinja por IP do servidor se possível)
3. Em `api/.env`:

```
GOOGLE_PLACES_API_KEY=sua_chave
```

4. Admin → **Cidades** → digite o nome → sugestões via `/api/admin/places-autocomplete.php`

Sem a chave, o cadastro manual de cidades ainda funciona; só o autocomplete fica indisponível.

## Menu admin (CMS)

- **Revista** — CRUD artigos (HTML + SEO + capa)
- **Atrativos** — CRUD + botão **Importar do site** (18 atrativos atuais via `api/data/attractions-seed.json`)
- **Guias cadastrados** — perfil completo (PIX, docs, cidade base)
- **Cidades** — base + Places
- **Excursões** — novas saídas: **1 a 4 atrativos no mesmo dia** (chips multi-seleção); **guia obrigatório** ao publicar; quórum mínimo 4

Se a lista de atrativos estiver vazia ao abrir Excursões/Atrativos, o painel tenta importar sozinho. Também: `/api/admin/setup-cms.php` (seed) ou `/api/admin/seed-attractions.php`.

Regenerar seed local: `node tools/export-attractions-seed.mjs`

Status **Publicada** → aparece no carrossel da home via `/api/excursions/carousel.php` (o JS prefere MySQL; se vazio, usa o JSON do build).

## Artigos / atrativos no HTML estático

O editor grava no MySQL. Para regenerar as páginas `.html` do site (SEO/estático), rode `npm run build` após exportar/sincronizar (próxima etapa: build lendo o banco). Enquanto isso, edite no admin e use o MySQL como fonte da verdade operacional; o carrossel de excursões já é live.
