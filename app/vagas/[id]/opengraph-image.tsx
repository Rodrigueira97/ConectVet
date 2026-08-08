import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { CATEGORIA_LABEL, getVaga } from '@/lib/api';
import { formatDataBR } from '@/lib/mockData';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ConectVet — vaga de plantão veterinário';

function loadFont(arquivo: string) {
  return readFile(path.join(process.cwd(), 'public/fonts', arquivo));
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] || '?'];
  return letras.join('').toUpperCase();
}

// Mesma imagem que qualquer link da vaga carrega — WhatsApp, iMessage,
// Telegram, Slack e os cards de link do LinkedIn/Instagram usam essa mesma
// tag og:image (arquivo gerado dinamicamente, sem precisar desenhar uma pra
// cada vaga publicada).
export default async function Image({ params }: { params: { id: string } }) {
  const [bold, regular] = await Promise.all([
    loadFont('Goldplay-Bold.otf'),
    loadFont('Goldplay_Font_Family/Goldplay Regular.otf'),
  ]);
  const fonts = [
    { name: 'Goldplay', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Goldplay', data: regular, weight: 400 as const, style: 'normal' as const },
  ];

  const vaga = await getVaga(params.id).catch(() => null);

  // Vaga não encontrada (link velho, id errado): card genérico da marca em
  // vez de deixar a prévia quebrada.
  if (!vaga) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundImage: 'linear-gradient(135deg, #00a19a 0%, #00706b 100%)', fontFamily: 'Goldplay',
          }}
        >
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>CONECTVET</div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const categoria = CATEGORIA_LABEL[vaga.categoria];
  const clinicaNome = vaga.clinica?.nome || 'ConectVet';
  const logoUrl = vaga.clinica?.logoUrl;
  const stats = `${formatDataBR(vaga.data)}  ·  ${vaga.horaInicio}–${vaga.horaFim}  ·  R$ ${vaga.valor}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '64px 72px', backgroundImage: 'linear-gradient(135deg, #00a19a 0%, #00706b 100%)',
          fontFamily: 'Goldplay', position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', width: 260, height: 260, borderRadius: 999, background: 'rgba(255,255,255,0.08)', top: -80, right: -60 }} />
        <div style={{ display: 'flex', position: 'absolute', width: 160, height: 160, borderRadius: 999, background: 'rgba(255,255,255,0.06)', bottom: 60, left: -40 }} />

        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.22)', color: '#fff',
              fontSize: 26, fontWeight: 700, padding: '10px 28px', borderRadius: 999, letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {categoria}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 128, height: 128,
              borderRadius: 999, overflow: 'hidden', flexShrink: 0,
              background: logoUrl ? '#fff' : 'rgba(255,255,255,0.18)',
              border: '5px solid rgba(255,255,255,0.85)',
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} width={128} height={128} style={{ objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, color: '#fff' }}>{iniciais(clinicaNome)}</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 800 }}>
            <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>{clinicaNome}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 400, color: 'rgba(255,255,255,0.92)' }}>{stats}</div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: 1.5 }}>CONECTVET</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
