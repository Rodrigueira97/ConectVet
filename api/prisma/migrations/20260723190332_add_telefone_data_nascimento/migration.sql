-- AlterTable
ALTER TABLE "clinicas" ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "telefone" TEXT;

-- AlterTable
ALTER TABLE "profissionais" ADD COLUMN     "dataNascimento" TIMESTAMP(3),
ADD COLUMN     "telefone" TEXT;
