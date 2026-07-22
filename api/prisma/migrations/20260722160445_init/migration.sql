-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLINICA', 'PROFISSIONAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('VETERINARIO_CLINICO', 'VETERINARIO_ESPECIALISTA', 'ESTAGIARIO', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "VagaStatus" AS ENUM ('ABERTA', 'PREENCHIDA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CandidaturaStatus" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "PagamentoStatus" AS ENUM ('RETIDO', 'LIBERADO');

-- CreateEnum
CREATE TYPE "AvaliacaoAutor" AS ENUM ('CLINICA', 'PROFISSIONAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "inscricaoEstadual" TEXT NOT NULL,
    "responsavelTecnico" TEXT NOT NULL,
    "cep" TEXT,
    "estado" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "bairro" TEXT,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "alvaraUrl" TEXT NOT NULL,
    "fotosEstrutura" TEXT[],
    "planosSaude" TEXT,
    "sistemas" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "funcao" "Categoria" NOT NULL,
    "tipoComprovacao" TEXT NOT NULL,
    "comprovanteUrl" TEXT NOT NULL,
    "idDocUrls" TEXT[],
    "crmvDocUrls" TEXT[],
    "curriculoUrl" TEXT NOT NULL,
    "areaAtuacao" TEXT NOT NULL,
    "planoSaude" TEXT,
    "regioesAtendimento" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vagas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "cep" TEXT,
    "estado" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "bairro" TEXT,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "data" DATE NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "status" "VagaStatus" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidaturas" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "status" "CandidaturaStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "valorBruto" DECIMAL(10,2) NOT NULL,
    "taxa" DECIMAL(10,2) NOT NULL,
    "valorLiquido" DECIMAL(10,2) NOT NULL,
    "status" "PagamentoStatus" NOT NULL DEFAULT 'RETIDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberadoEm" TIMESTAMP(3),

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "autor" "AvaliacaoAutor" NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_userId_key" ON "clinicas"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_cnpj_key" ON "clinicas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_userId_key" ON "profissionais"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profissionais_documento_key" ON "profissionais"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "candidaturas_vagaId_profissionalId_key" ON "candidaturas"("vagaId", "profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_vagaId_key" ON "pagamentos"("vagaId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_candidaturaId_key" ON "pagamentos"("candidaturaId");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_candidaturaId_autor_key" ON "avaliacoes"("candidaturaId", "autor");

-- AddForeignKey
ALTER TABLE "clinicas" ADD CONSTRAINT "clinicas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vagas" ADD CONSTRAINT "vagas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidaturas" ADD CONSTRAINT "candidaturas_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "candidaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
