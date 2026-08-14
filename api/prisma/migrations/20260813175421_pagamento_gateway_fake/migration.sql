-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'CARTAO');

-- CreateEnum
CREATE TYPE "MotivoReembolso" AS ENUM ('NAO_COMPARECEU', 'DESISTENCIA');

-- CreateEnum
CREATE TYPE "ContaRecebimentoStatus" AS ENUM ('NAO_CONFIGURADA', 'EM_ANALISE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificacaoTipo" ADD VALUE 'MARCADO_NAO_COMPARECEU';
ALTER TYPE "NotificacaoTipo" ADD VALUE 'PAGAMENTO_LIBERADO_PENDENTE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PagamentoStatus" ADD VALUE 'AGUARDANDO_COBRANCA';
ALTER TYPE "PagamentoStatus" ADD VALUE 'PROCESSANDO';
ALTER TYPE "PagamentoStatus" ADD VALUE 'FALHOU';
ALTER TYPE "PagamentoStatus" ADD VALUE 'LIBERADO_PENDENTE';
ALTER TYPE "PagamentoStatus" ADD VALUE 'REEMBOLSADO';
ALTER TYPE "PagamentoStatus" ADD VALUE 'CANCELADO';
ALTER TYPE "PagamentoStatus" ADD VALUE 'EM_DISPUTA';

-- DropIndex
DROP INDEX "pagamentos_vagaId_key";

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "motivoFalha" TEXT,
ADD COLUMN     "motivoReembolso" "MotivoReembolso",
ADD COLUMN     "reembolsadoEm" TIMESTAMP(3),
ADD COLUMN     "taxaGateway" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorTotal" DECIMAL(10,2),
ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_COBRANCA';

-- CreateTable
CREATE TABLE "contas_recebimento" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "status" "ContaRecebimentoStatus" NOT NULL DEFAULT 'NAO_CONFIGURADA',
    "tipoChavePix" "TipoChavePix",
    "chavePix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contas_recebimento_profissionalId_key" ON "contas_recebimento"("profissionalId");

-- CreateIndex
CREATE INDEX "pagamentos_vagaId_idx" ON "pagamentos"("vagaId");

-- AddForeignKey
ALTER TABLE "contas_recebimento" ADD CONSTRAINT "contas_recebimento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
