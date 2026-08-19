-- AlterEnum
ALTER TYPE "NotificacaoTipo" ADD VALUE 'CONVITE_PARA_VAGA';

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "vagaId" TEXT;

-- AlterTable
ALTER TABLE "vagas" ADD COLUMN     "codigo" TEXT;

-- CreateTable
CREATE TABLE "favoritos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_clinicaId_profissionalId_key" ON "favoritos"("clinicaId", "profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "vagas_codigo_key" ON "vagas"("codigo");

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "vagas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

