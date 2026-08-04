-- AlterTable
-- "emailVerificado" nasce com DEFAULT true pra não deslogar as contas já
-- existentes; o ALTER seguinte muda o default pra false só pra daí em diante
-- (novos cadastros passam a exigir confirmação por e-mail).
ALTER TABLE "users" ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailVerificacaoToken" TEXT,
ADD COLUMN     "emailVerificacaoExpira" TIMESTAMP(3);

ALTER TABLE "users" ALTER COLUMN "emailVerificado" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificacaoToken_key" ON "users"("emailVerificacaoToken");
