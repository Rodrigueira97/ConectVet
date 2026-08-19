-- AlterEnum
ALTER TYPE "NotificacaoTipo" ADD VALUE 'PROBLEMA_REPORTADO';

-- AlterTable
ALTER TABLE "candidaturas" ADD COLUMN     "checkInEm" TIMESTAMP(3),
ADD COLUMN     "codigoCheckIn" TEXT;

-- AlterTable
ALTER TABLE "pagamentos" ADD COLUMN     "disputaAbertaEm" TIMESTAMP(3),
ADD COLUMN     "disputaDescricao" TEXT,
ADD COLUMN     "disputaMotivo" TEXT;
