import type { Metadata } from 'next';
import { CATEGORIA_LABEL, getVaga } from '@/lib/api';
import VagaPageClient from './VagaPageClient';

// Metadata roda no servidor (não pode ficar no arquivo 'use client' que faz
// toda a parte interativa da página — daí o split em dois arquivos). O
// próprio Next já injeta as tags de og:image a partir de opengraph-image.tsx
// nesta mesma pasta; aqui só cuidamos de título e descrição.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const vaga = await getVaga(params.id).catch(() => null);
  if (!vaga) {
    return { title: 'Vaga não encontrada | ConectVet' };
  }

  const categoria = CATEGORIA_LABEL[vaga.categoria];
  const clinica = vaga.clinica?.nome || 'ConectVet';
  const local = [vaga.bairro, vaga.cidade].filter(Boolean).join(', ');
  // Prioriza o texto que a própria clínica escreveu; nem toda vaga tem esse
  // campo preenchido, então cai num resumo automático pra nunca ficar em
  // branco no card de quem recebe o link.
  const resumoAutomatico = [categoria, local, `R$ ${vaga.valor}`].filter(Boolean).join(' · ');
  const descricaoCompleta = vaga.descricao?.trim() || resumoAutomatico;
  const LIMITE_DESCRICAO = 200;
  const descricao = descricaoCompleta.length > LIMITE_DESCRICAO
    ? `${descricaoCompleta.slice(0, LIMITE_DESCRICAO - 3).trimEnd()}...`
    : descricaoCompleta;
  const titulo = `${categoria} — ${clinica}`;

  return {
    title: `${titulo} | ConectVet`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      siteName: 'ConectVet',
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
    },
  };
}

export default function Page() {
  return <VagaPageClient />;
}
