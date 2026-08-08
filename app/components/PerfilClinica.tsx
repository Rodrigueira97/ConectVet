'use client';
import { useState } from 'react';
import { buildEndereco, mapsLink } from '@/lib/mockData';
import { BuildingIcon, ChevronLeftIcon, CloseIcon, PinIcon, SearchIcon } from '@/app/components/icons';
import { VagaCardPublica } from '@/app/components/VagaCardPublica';
import { AvaliacaoClinica, ClinicaPublica, FotoEstrutura, Vaga } from '@/lib/api';

function formatMesAno(iso: string) {
  const semPonto = new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '');
  return semPonto.charAt(0).toUpperCase() + semPonto.slice(1);
}

// Perfil público da clínica — acessado ao clicar na foto ou no nome dela em
// Detalhes da vaga (ver VagaDetalhe.tsx). Cabeçalho colorido com selo de
// vagas abertas + cartões de estatística "flutuando" sobre a base dele,
// painel branco agrupando sobre/endereço/fotos/avaliações, e um segundo
// painel pras vagas abertas — mesmo agrupamento do protótipo.
export function PerfilClinicaView({
  clinica, totalVagas, vagasAbertas, avaliacoes, onBack,
}: {
  clinica: ClinicaPublica;
  totalVagas: number;
  vagasAbertas: Vaga[];
  avaliacoes: AvaliacaoClinica[];
  onBack: () => void;
}) {
  const local = buildEndereco(clinica);
  const localCurto = [clinica.bairro, clinica.cidade].filter(Boolean).join(', ') || clinica.cidade;
  const [fotoAberta, setFotoAberta] = useState<FotoEstrutura | null>(null);

  return (
    <div className="max-w-[1080px] mx-auto p-8">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-bold text-white/85 hover:text-white mb-4">
        <ChevronLeftIcon className="w-[15px] h-[15px]" /> Voltar
      </button>

      <div className="relative rounded-3xl p-5 sm:p-6 pb-10 sm:pb-12 shadow-lg bg-paws-header-open">
        {vagasAbertas.length > 0 && (
          <span className="hidden sm:inline-flex absolute top-5 right-6 items-center gap-1.5 bg-white text-primaryDeep text-[11px] font-extrabold pl-2 pr-2.5 py-1.5 rounded-full shadow">
            <span className="w-[6px] h-[6px] rounded-full shrink-0 bg-primary" />
            {vagasAbertas.length} {vagasAbertas.length === 1 ? 'vaga aberta agora' : 'vagas abertas agora'}
          </span>
        )}

        <div className="flex items-center gap-3.5 sm:pr-40">
          <button
            type="button"
            onClick={() => clinica.logoUrl && setFotoAberta({ url: clinica.logoUrl, descricao: clinica.nome })}
            disabled={!clinica.logoUrl}
            aria-label={clinica.logoUrl ? 'Ampliar foto da clínica' : undefined}
            className="group relative w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-2xl bg-white/90 p-[3px] shadow-lg shrink-0 disabled:cursor-default"
          >
            <div className="w-full h-full rounded-[13px] bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
              {clinica.logoUrl ? (
                <img src={clinica.logoUrl} alt={clinica.nome} className="w-full h-full object-cover" />
              ) : (
                <BuildingIcon className="w-7 h-7" />
              )}
            </div>
            {clinica.logoUrl && (
              <span className="absolute inset-[3px] rounded-[13px] flex items-center justify-center text-white bg-ink/0 group-hover:bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <SearchIcon className="w-4 h-4" />
              </span>
            )}
          </button>
          <div className="min-w-0">
            <h1 className="text-white text-2xl font-extrabold mb-1">{clinica.nome}</h1>
            {clinica.notaMedia && clinica.totalAvaliacoes ? (
              <div className="text-white/90 text-sm font-bold mb-1 inline-flex items-center gap-1.5">
                <span className="text-[#FFD666]">★</span> {clinica.notaMedia.toFixed(1)}
                <span className="text-white/65 font-semibold">({clinica.totalAvaliacoes} avaliações)</span>
              </div>
            ) : null}
            <div className="text-white/80 text-[13px] font-semibold flex items-center gap-1">
              <PinIcon className="w-3.5 h-3.5 shrink-0" /> {localCurto} · Na conectVet desde {formatMesAno(clinica.createdAt)}
            </div>
            {vagasAbertas.length > 0 && (
              <span className="sm:hidden mt-2.5 inline-flex items-center gap-1.5 bg-white text-primaryDeep text-[11px] font-extrabold pl-2 pr-2.5 py-1.5 rounded-full shadow">
                <span className="w-[6px] h-[6px] rounded-full shrink-0 bg-primary" />
                {vagasAbertas.length} {vagasAbertas.length === 1 ? 'vaga aberta agora' : 'vagas abertas agora'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mx-1 sm:mx-2 -mt-7 sm:-mt-8 mb-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 py-3.5 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-ink leading-none">{totalVagas}</div>
          <div className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wide text-gray-400 mt-1.5">Vagas publicadas</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 py-3.5 text-center">
          <div className="text-xl sm:text-2xl font-extrabold text-ink leading-none inline-flex items-center gap-1">
            {clinica.notaMedia ? (<><span className="text-amber-400 text-lg">★</span>{clinica.notaMedia.toFixed(1)}</>) : '—'}
          </div>
          <div className="text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wide text-gray-400 mt-1.5">Avaliação média</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
        {clinica.sobre && (
          <>
            <div className="text-[15px] font-extrabold text-ink mb-2">Sobre a clínica</div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{clinica.sobre}</div>
          </>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-2">Endereço</div>
            <div className="text-[14.5px] font-semibold text-ink mb-2">{local}</div>
            <a href={mapsLink(local)} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline">
              Ver no Google Maps →
            </a>
          </div>

          {clinica.fotosEstrutura.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-5">
              <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-3">Fotos da clínica</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {clinica.fotosEstrutura.map((foto) => (
                  <button
                    key={foto.url}
                    onClick={() => setFotoAberta(foto)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                  >
                    <img src={foto.url} alt={foto.descricao || 'Foto da clínica'} className="w-full h-full object-cover" />
                    {foto.descricao && (
                      <span
                        className="absolute left-0 right-0 bottom-0 px-2 py-1.5 text-[10.5px] font-bold text-white text-left"
                        style={{ background: 'linear-gradient(to top, rgba(4,20,25,.72), transparent)' }}
                      >
                        {foto.descricao}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-gray-400 mb-1">Avaliações recebidas</div>
            {avaliacoes.length === 0 ? (
              <div className="text-sm text-gray-400 py-3">Essa clínica ainda não tem avaliações de outros profissionais.</div>
            ) : (
              avaliacoes.map((a) => (
                <div key={a.id} className="py-3.5 border-b border-gray-200 last:border-b-0 last:pb-0 first:pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13.5px] font-extrabold text-ink">{a.profissionalNome}</div>
                    <div className="text-amber-500 text-sm tracking-widest shrink-0">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</div>
                  </div>
                  {a.comentario && <div className="text-[13.5px] leading-relaxed text-gray-700 mt-1">{a.comentario}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {fotoAberta && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(4,20,25,0.7)] flex items-center justify-center p-6"
          onClick={() => setFotoAberta(null)}
        >
          <div className="w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={fotoAberta.url} alt={fotoAberta.descricao || 'Foto da clínica'} className="w-full aspect-[4/3] object-cover rounded-2xl" />
              <button
                onClick={() => setFotoAberta(null)}
                aria-label="Fechar"
                className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-white text-ink flex items-center justify-center shadow-lg"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            {fotoAberta.descricao && <div className="text-white text-sm font-bold text-center mt-3">{fotoAberta.descricao}</div>}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="text-[15px] font-extrabold text-ink mb-3">Vagas abertas nesta clínica</div>
        {vagasAbertas.length === 0 ? (
          <div className="text-sm text-gray-400">Nenhuma vaga aberta no momento nesta clínica.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vagasAbertas.map((v) => (
              <VagaCardPublica key={v.id} vaga={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
