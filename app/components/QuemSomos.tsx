import { ArrowRightIcon, PawIcon } from '@/app/components/icons';

// Conteúdo da aba "Quem somos", compartilhado entre a área do profissional e
// a da clínica — mesmo texto dos dois lados, só muda o destino do botão no
// final (cada área tem sua própria noção de "página inicial").
export function QuemSomosView({ ctaLabel, onCta }: { ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="max-w-[880px] mx-auto p-8">
      <h1 className="text-2xl font-extrabold mb-1 text-white">Quem somos</h1>
      <p className="text-sm text-white/85 mb-5">A história e a missão por trás do ConectVet</p>

      <div className="bg-[#eef7f6] rounded-[28px] p-6 sm:p-8">
        <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-[0_4px_14px_rgba(4,45,76,0.1)] flex items-center justify-center text-primary mb-3.5">
          <PawIcon className="w-6 h-[22px]" />
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-primaryDeep/70 mb-2">Nossa missão</div>
        <div className="text-2xl sm:text-[26px] font-extrabold leading-snug text-ink mb-3">
          Nenhuma clínica sem cobertura. Nenhum profissional sem plantão.
        </div>
        <p className="text-[15px] leading-relaxed text-gray-700 max-w-[520px]">
          O ConectVet existe pra encurtar a distância entre uma clínica que precisa de reforço no plantão e um
          profissional veterinário disponível pra assumir — com rapidez, transparência e sem burocracia, do
          primeiro contato até a avaliação depois do plantão.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-7 mt-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-gray-400 mb-3.5">Nossa história</div>
        <div className="flex flex-col gap-3 text-[14.5px] leading-relaxed text-gray-700">
          <p>
            Começamos percebendo um problema pequeno no tamanho, mas grande na hora: uma clínica com a agenda
            cheia numa sexta à noite e sem ninguém pra cobrir o plantão — enquanto, a poucos quilômetros dali, um
            profissional veterinário estava disponível e nem sabia que aquela vaga existia.
          </p>
          <p>
            O ConectVet nasceu em <span className="text-ink font-extrabold">Barbacena</span>, no interior de Minas
            Gerais, testando o modelo com clínicas e profissionais da região antes de pensar grande. A ideia
            sempre foi simples: uma ponte direta entre quem precisa de cobertura e quem quer preencher um
            plantão, com confiança dos dois lados.
          </p>
          <p>
            Ainda somos um produto em construção — esse é o protótipo{' '}
            <span className="text-ink font-extrabold">v0.01</span>! — crescendo com calma, com o cuidado de quem
            sabe que, no fim da linha, tem sempre um animal esperando atendimento.
          </p>
        </div>

        {onCta && (
          <button
            onClick={onCta}
            className="inline-flex items-center gap-1.5 bg-primaryTint text-primaryDeep text-[13.5px] font-extrabold px-[18px] py-2.5 rounded-full mt-5 hover:bg-primaryTint/70"
          >
            {ctaLabel || 'Voltar para o início'} <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
