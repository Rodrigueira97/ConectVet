import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@conectvet.com';
  const senha = process.env.ADMIN_SENHA ?? 'admin1234';

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`Admin já existe: ${email}`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  await prisma.user.create({
    data: { email, senhaHash, role: 'ADMIN' },
  });
  console.log(`Admin criado: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
