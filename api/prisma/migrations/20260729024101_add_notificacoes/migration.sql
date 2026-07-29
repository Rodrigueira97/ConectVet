-- CreateEnum
CREATE TYPE "NotificacaoTipo" AS ENUM ('CANDIDATURA_ACEITA', 'CANDIDATURA_RECUSADA', 'VAGA_PREENCHIDA_OUTRO', 'PAGAMENTO_LIBERADO', 'AVALIACAO_RECEBIDA');

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "NotificacaoTipo" NOT NULL,
    "texto" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
