# ConectVet

Plataforma que conecta clínicas veterinárias e profissionais para plantões. Frontend em Next.js 14 (App Router) + TypeScript + Tailwind, backend em NestJS + Prisma (PostgreSQL) na pasta [`api/`](api/).

## Rotas (frontend)
- `/` — Login.
- `/cadastro` — Criação de conta (Clínica ou Profissional), com upload de documentos.
- `/clinica` — Home (feed), Criar/editar vaga, Painel (candidatos, pagamento retido/liberado, avaliação do profissional), Perfil.
- `/profissional` — Home (feed com candidatura e "perto de você"), Minhas candidaturas (com avaliação da clínica), Perfil.
- `/admin` — Login administrativo + painel de pagamentos (retido/liberado/taxa), com liberação manual.

## Rodar localmente

Precisa do backend rodando (veja [`api/README.md`](api/README.md)) antes do frontend, já que todas as telas consomem a API de verdade — não há mais dados mockados.

```bash
# 1. Backend (numa pasta separada)
cd api
cp .env.example .env   # ajuste DATABASE_URL
pnpm install
npx prisma migrate dev
npx prisma db seed     # cria o usuário admin
pnpm run start:dev      # sobe em http://localhost:3333

# 2. Frontend (na raiz do repo)
cp .env.example .env.local   # já aponta pra http://localhost:3333/api por padrão
pnpm install
pnpm dev                     # sobe em http://localhost:3000
```

## Deploy: Render (API) + Neon (banco) + Vercel (frontend)

Essa é a stack usada por enquanto, enquanto o produto está em validação — todas com free tier:

1. **Neon**: crie um projeto Postgres. Copie as duas connection strings do dashboard — a *pooled* (host com `-pooler`) vira `DATABASE_URL`, a direta vira `DIRECT_URL`.
2. **Render**: aponte um Web Service para este repositório — o [`render.yaml`](render.yaml) na raiz já configura root dir (`api/`), build (`pnpm install && pnpm run build && npx prisma migrate deploy`) e start (`node dist/src/main.js`). Preencha as env vars pedidas (`DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN` com a URL do frontend, `ADMIN_EMAIL`/`ADMIN_SENHA`), depois rode `npx prisma db seed` uma vez (shell do Render) para criar o admin.
3. **Vercel** (ou onde preferir hospedar o Next.js): configure `NEXT_PUBLIC_API_URL` apontando para a URL pública do serviço no Render (ex.: `https://conectvet-api.onrender.com/api`).

## Observações

- Upload de arquivos (alvará, fotos, comprovantes, currículo) usa armazenamento local em disco na API (`api/uploads`) por enquanto — funciona bem em dev, mas é **efêmero** no Render free tier (some a cada redeploy/restart). Trocar por S3/Cloudinary/R2 é o próximo passo antes de ter usuários reais.
- Cores (`tailwind.config.ts`): primary `#63c94e` (verde), secondary `#2e8cad` (azul/teal).
