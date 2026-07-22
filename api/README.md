# ConectVet API

Backend em NestJS + Prisma (PostgreSQL) para a plataforma ConectVet, que conecta clínicas veterinárias e profissionais para plantões.

## Stack

- **NestJS 11** — módulos, guards, DTOs com `class-validator`
- **Prisma 7** — ORM, usando o driver adapter `@prisma/adapter-pg` (Postgres puro, sem Accelerate)
- **JWT** (`@nestjs/jwt` + `passport-jwt`) — autenticação por token, com `RolesGuard` para separar CLINICA / PROFISSIONAL / ADMIN
- **bcryptjs** — hash de senha (versão pura em JS, sem dependência nativa)

## Domínio

O schema (`prisma/schema.prisma`) modela: `User` (conta + role), `Clinica`, `Profissional`, `Vaga`, `Candidatura`, `Pagamento` e `Avaliacao` — espelhando os fluxos já existentes no frontend (`lib/types.ts`, `lib/mockData.ts` e as telas de cadastro/painel).

Regras de negócio já implementadas no backend:

- **Um aprovado por vaga**: ao aceitar uma candidatura, as demais pendentes da mesma vaga são recusadas automaticamente e a vaga vira `PREENCHIDA`.
- **Pagamento retido → liberado**: aceitar uma candidatura já cria o `Pagamento` com a taxa de 5% calculada; liberar o pagamento marca a vaga como `CONCLUIDA`.
- **Comprovação de função**: o campo enviado depende da função (CRMV para veterinários, matrícula ativa para estagiários, certificado para auxiliares) — a validação de qual documento pedir é feita no frontend; o backend só exige `comprovanteUrl` presente.

## Upload de arquivos

`POST /api/uploads` (campo `file`) e `POST /api/uploads/multiplos` (campo `files`, multipart) recebem os arquivos e devolvem a URL pública. Sem guard de autenticação de propósito — o cadastro precisa enviar documentos antes de existir conta/token. Armazenamento é em disco local (pasta `uploads/`, servida em `/uploads/*`); em produção isso é **efêmero no Render free tier** (some a cada redeploy), então antes de ter usuários reais troque por S3/Cloudinary/R2.

## Rodando localmente

```bash
cp .env.example .env   # ajuste DATABASE_URL/DIRECT_URL/JWT_SECRET
pnpm install
npx prisma migrate dev   # cria/atualiza as tabelas
npx prisma db seed       # cria o usuário admin (ADMIN_EMAIL/ADMIN_SENHA do .env)
pnpm run start:dev
```

## Deploy (Render + Neon)

O [`render.yaml`](../render.yaml) na raiz do monorepo já configura o Web Service (`rootDir: api`, build com `prisma migrate deploy`, start `node dist/src/main.js`). No Neon, use a connection string **pooled** como `DATABASE_URL` e a **direta** (sem `-pooler`) como `DIRECT_URL` — migrations precisam da conexão direta, o app em runtime usa a pooled via `@prisma/adapter-pg`. Depois do primeiro deploy, rode `npx prisma db seed` uma vez (shell do Render) para criar o admin.

A API sobe com prefixo global `/api` (ex.: `POST /api/auth/login`).

## Principais rotas

| Método | Rota | Quem acessa |
|---|---|---|
| POST | `/api/auth/register/clinica` | público |
| POST | `/api/auth/register/profissional` | público |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | autenticado |
| GET | `/api/vagas` | público (feed de vagas abertas) |
| POST | `/api/vagas` | CLINICA |
| GET | `/api/vagas/minhas` | CLINICA |
| POST | `/api/candidaturas` | PROFISSIONAL |
| GET | `/api/candidaturas/minhas` | PROFISSIONAL |
| GET | `/api/candidaturas/vaga/:vagaId` | CLINICA (dona da vaga) |
| PATCH | `/api/candidaturas/:id/aceitar` | CLINICA (dona da vaga) |
| PATCH | `/api/candidaturas/:id/recusar` | CLINICA (dona da vaga) |
| PATCH | `/api/pagamentos/:id/liberar` | CLINICA ou ADMIN |
| GET | `/api/pagamentos` | ADMIN |
| POST | `/api/avaliacoes` | CLINICA ou PROFISSIONAL |
| POST | `/api/uploads`, `/api/uploads/multiplos` | público |

## Próximos passos sugeridos

- Trocar o storage local de uploads por S3/Cloudinary/R2 antes de ter usuários reais (ver seção acima).
- Swagger (`@nestjs/swagger`) pra documentar a API interativamente.
- Testes e2e cobrindo os fluxos de candidatura → pagamento → avaliação.
