import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { CATEGORIA_LABEL, getVaga } from '@/lib/api';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ConectVet — vaga de plantão veterinário';

function loadFont(arquivo: string) {
  return readFile(path.join(process.cwd(), 'public/fonts', arquivo));
}

function loadAsDataUri(caminhoPublico: string, mime: string) {
  return readFile(path.join(process.cwd(), 'public', caminhoPublico)).then(
    (buf) => `data:${mime};base64,${buf.toString('base64')}`,
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? [partes[0][0], partes[partes.length - 1][0]] : [partes[0]?.[0] || '?'];
  return letras.join('').toUpperCase();
}

function diaMesCurto(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
}

// "16:00" -> "16h", "20:30" -> "20h30"
function horaCompacta(hhmm: string) {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

// A marca (ícone + "conectvet") sobre o fundo teal, do mesmo jeito que a
// sidebar mostra ("conect" em ink, "vet" em primaryDeep) — só que aqui não
// tem fundo branco atrás, então essas duas cores mesmo ficam mais discretas
// do que na sidebar (é a mesma marca, direto na imagem).
function Marca({ mark }: { mark: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64,
          borderRadius: 20, background: '#00a19a', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={47} height={47} />
      </div>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>
        <span style={{ color: '#042d4c' }}>conect</span>
        <span style={{ color: '#00706b' }}>vet</span>
      </div>
    </div>
  );
}

// Mesma imagem que qualquer link da vaga carrega — WhatsApp, iMessage,
// Telegram, Slack e os cards de link do LinkedIn/Instagram usam essa mesma
// tag og:image (arquivo gerado dinamicamente, sem precisar desenhar uma pra
// cada vaga publicada). Layout "C" do protótipo: cards de data/horário/valor
// no rodapé, o mesmo agrupamento que já existe na própria página da vaga.
export default async function Image({ params }: { params: { id: string } }) {
  const [bold, regular, mark] = await Promise.all([
    loadFont('Goldplay-Bold.otf'),
    loadFont('Goldplay_Font_Family/Goldplay Regular.otf'),
    loadAsDataUri('og/logo-mark.png', 'image/png'),
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

  const cardBase = {
    display: 'flex', flexDirection: 'column' as const, flex: 1, borderRadius: 24, padding: '26px 30px',
  };

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

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.22)', color: '#fff',
              fontSize: 26, fontWeight: 700, padding: '10px 28px', borderRadius: 999, letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {categoria}
          </div>
          <Marca mark={mark} />
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
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
            <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: '#fff', lineHeight: 1.15 }}>{clinicaNome}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ ...cardBase, background: 'rgba(255,255,255,0.14)' }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.78)', marginBottom: 8 }}>Data</div>
            <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, color: '#fff' }}>{diaMesCurto(vaga.data)}</div>
          </div>
          <div style={{ ...cardBase, background: 'rgba(255,255,255,0.14)' }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.78)', marginBottom: 8 }}>Horário</div>
            <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, color: '#fff' }}>{horaCompacta(vaga.horaInicio)}–{horaCompacta(vaga.horaFim)}</div>
          </div>
          <div style={{ ...cardBase, background: 'rgba(255,255,255,0.96)' }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#00847e', marginBottom: 8 }}>Valor</div>
            <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, color: '#042d4c' }}>R$ {vaga.valor}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
