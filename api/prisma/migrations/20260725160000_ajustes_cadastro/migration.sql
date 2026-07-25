-- Split responsavelTecnico into nome + CRMV (backfill nome from the old free-text column)
ALTER TABLE "clinicas" ADD COLUMN "responsavelTecnicoNome" TEXT;
ALTER TABLE "clinicas" ADD COLUMN "responsavelTecnicoCrmv" TEXT;
UPDATE "clinicas" SET "responsavelTecnicoNome" = "responsavelTecnico";
ALTER TABLE "clinicas" DROP COLUMN "responsavelTecnico";

-- Convert fotosEstrutura from text[] to a jsonb array of {url, descricao}
ALTER TABLE "clinicas" ADD COLUMN "fotosEstrutura_new" JSONB NOT NULL DEFAULT '[]';
UPDATE "clinicas"
SET "fotosEstrutura_new" = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', foto, 'descricao', NULL)), '[]'::jsonb)
  FROM unnest("fotosEstrutura") AS foto
);
ALTER TABLE "clinicas" DROP COLUMN "fotosEstrutura";
ALTER TABLE "clinicas" RENAME COLUMN "fotosEstrutura_new" TO "fotosEstrutura";

-- Remove unused "Plano de saúde" field from profissionais
ALTER TABLE "profissionais" DROP COLUMN "planoSaude";

-- Currículo passa a ser opcional no cadastro
ALTER TABLE "profissionais" ALTER COLUMN "curriculoUrl" DROP NOT NULL;
