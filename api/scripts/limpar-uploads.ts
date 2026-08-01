// Esvazia o bucket R2 de uploads e limpa as referências a arquivo no banco,
// pra recomeçar os testes de fotos/documentos do zero. Não mexe em alvaraUrl
// (Clinica) nem comprovanteUrl (Profissional) — são campos obrigatórios no
// cadastro (NOT NULL); apagar deixaria a conta num estado inválido. Pra
// recomeçar esses também, o caminho é apagar as contas de teste e recadastrar.
//
// Uso: npm run limpar:uploads   (dentro de api/)
import 'dotenv/config';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const bucket = process.env.R2_BUCKET_NAME!;
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function esvaziarBucket() {
  let continuationToken: string | undefined;
  let total = 0;
  do {
    const lista = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    const chaves = (lista.Contents || [])
      .map((o) => ({ Key: o.Key }))
      .filter((o): o is { Key: string } => !!o.Key);

    if (chaves.length > 0) {
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chaves } }));
      total += chaves.length;
      console.log(`Apagados ${chaves.length} arquivo(s) — total até agora: ${total}`);
    }
    continuationToken = lista.IsTruncated ? lista.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`Bucket "${bucket}" esvaziado. Total: ${total} arquivo(s).`);
}

async function limparReferenciasNoBanco() {
  const clinicas = await prisma.clinica.updateMany({
    data: { logoUrl: null, fotosEstrutura: [] as unknown as Prisma.InputJsonValue },
  });
  const profissionais = await prisma.profissional.updateMany({
    data: { fotoUrl: null, curriculoUrl: null, idDocUrls: [] },
  });
  console.log(`Referências limpas: ${clinicas.count} clínica(s), ${profissionais.count} profissional(is).`);
  console.log('alvaraUrl e comprovanteUrl não foram tocados (campos obrigatórios) — veja o comentário no topo do script.');
}

async function main() {
  await esvaziarBucket();
  await limparReferenciasNoBanco();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
