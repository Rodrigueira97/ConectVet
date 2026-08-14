'use client';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/app/components/PublicHeader';
import { PublicFooter } from '@/app/components/PublicFooter';
import {
  SearchIcon, CalendarIcon, ClockIcon, CheckIcon, LockIcon, ShieldIcon,
  StarIcon, BuildingIcon, UserIcon, PlusIcon, ArrowRightIcon, PinIcon,
} from '@/app/components/icons';

// Landing page pública — a Home deixou de ser a lista de vagas (isso agora mora em
// /vagas, com aba própria no menu) e virou vitrine: apresenta a proposta pros dois
// lados (profissional e clínica) e dá um gostinho das vagas abertas, sem duplicar o
// feed completo. Detalhado num protótipo antes de aplicar (ver histórico da conversa).
//
// Os cards de vaga aqui embaixo são exemplos fixos (clínica/cidade fictícias), não a
// vaga real de ninguém — é vitrine, não a listagem de verdade (essa mora em /vagas,
// com dado ao vivo). Evita expor a clínica/cidade real de quem já usa a plataforma
// numa tela de marketing pública.
const VAGAS_EXEMPLO = [
  { clinica: 'Clínica Vetville', categoria: 'Veterinário Clínico', local: 'Pinheiros, São Paulo - SP', data: '12/08', horario: '08:00–18:00', valor: 320 },
  { clinica: 'São Francisco', categoria: 'Auxiliar', local: 'Moema, São Paulo - SP', data: '15/08', horario: '13:00–21:00', valor: 100 },
  { clinica: 'PetSaúde Jardins', categoria: 'Veterinário Especialista', local: 'Vila Mariana, São Paulo - SP', data: '20/08', horario: '08:00–14:00', valor: 280 },
];

export default function HomePublica() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />

      {/* ================= hero ================= */}
      <section className="relative overflow-hidden px-5 sm:px-8 pt-12 sm:pt-16 pb-10">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-9 items-center relative z-[1]">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white bg-white/15 px-3.5 py-1.5 rounded-full mb-5">
              🐾 Plantão veterinário, sem enrolação
            </span>
            <h1 className="text-[28px] sm:text-[38px] font-extrabold leading-[1.18] text-white -tracking-[0.01em] mb-1.5">
              Nenhuma <span className="text-[#baf0ea]">clínica</span> sem cobertura.<br />
              Nenhum <span className="text-[#baf0ea]">profissional</span> sem plantão.
            </h1>
            <p className="text-[13.5px] sm:text-[15.5px] leading-relaxed text-white/90 max-w-[480px] my-4">
              ConectVet: a maneira mais simples de conectar clínicas veterinárias e profissionais qualificados,
              de forma rápida e segura.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <button
                onClick={() => router.push('/vagas')}
                className="inline-flex items-center justify-center gap-2 bg-white text-primaryDeep text-sm font-extrabold px-5 py-3.5 rounded-[13px] shadow-[0_10px_24px_rgba(4,45,76,0.18)]"
              >
                <SearchIcon className="w-4 h-4" /> Ver vagas abertas
              </button>
              <button
                onClick={() => router.push('/cadastro?role=clinica')}
                className="inline-flex items-center justify-center gap-2 bg-white/10 border-[1.5px] border-white/50 text-white text-sm font-extrabold px-5 py-3.5 rounded-[13px]"
              >
                <BuildingIcon className="w-4 h-4" /> Sou clínica, quero publicar
              </button>
            </div>
            <div className="text-xs font-bold text-white/75 mt-4">
              Já tem conta? <a href="/entrar" className="text-white underline">Entrar</a>
            </div>
          </div>

          {/* Ilustração + cards flutuantes — decorativo, escondido no mobile pra não brigar com o headline */}
          <div className="hidden md:block relative h-[320px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 260 260" fill="none" className="w-[300px] h-[300px]">
                <ellipse cx="130" cy="235" rx="80" ry="14" fill="#042d4c" opacity="0.08" />
                <ellipse cx="105" cy="215" rx="15" ry="24" fill="#fff" />
                <ellipse cx="155" cy="215" rx="15" ry="24" fill="#fff" />
                <path d="M205 165 q26 -8 22 -37" stroke="#fff" strokeWidth="15" strokeLinecap="round" />
                <ellipse cx="130" cy="178" rx="72" ry="56" fill="#fff" />
                <ellipse cx="80" cy="88" rx="24" ry="36" fill="#fff" transform="rotate(-20 80 88)" />
                <ellipse cx="180" cy="88" rx="24" ry="36" fill="#fff" transform="rotate(20 180 88)" />
                <circle cx="130" cy="102" r="56" fill="#fff" />
                <path d="M104 132 q0 30 26 36 q26 -6 26 -36" stroke="#00847e" strokeWidth="6" strokeLinecap="round" />
                <circle cx="130" cy="167" r="11" fill="#00847e" />
                <circle cx="130" cy="167" r="4.5" fill="#eaf9f7" />
                <ellipse cx="130" cy="120" rx="27" ry="21" fill="#eaf9f7" />
                <ellipse cx="130" cy="109" rx="9.5" ry="7.5" fill="#042d4c" />
                <circle cx="111" cy="90" r="6" fill="#042d4c" />
                <circle cx="149" cy="90" r="6" fill="#042d4c" />
                <circle cx="113.5" cy="87.5" r="1.8" fill="#fff" />
                <circle cx="151.5" cy="87.5" r="1.8" fill="#fff" />
                <path d="M116 126 Q130 137 144 126" stroke="#042d4c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <g opacity="0.55" fill="#fff">
                  <g transform="translate(28 150) scale(0.34)"><ellipse cx="50" cy="63" rx="20" ry="16" /><circle cx="24" cy="32" r="10" /><circle cx="41" cy="15" r="9" /><circle cx="59" cy="15" r="9" /><circle cx="76" cy="32" r="10" /></g>
                  <g transform="translate(198 195) scale(0.28)"><ellipse cx="50" cy="63" rx="20" ry="16" /><circle cx="24" cy="32" r="10" /><circle cx="41" cy="15" r="9" /><circle cx="59" cy="15" r="9" /><circle cx="76" cy="32" r="10" /></g>
                </g>
              </svg>
            </div>
            <div className="absolute top-1.5 right-6 z-[1] w-[230px] bg-white rounded-2xl shadow-[0_20px_44px_rgba(4,45,76,0.22)] p-3.5 -rotate-[4deg]">
              <span className="inline-block text-[9px] font-extrabold uppercase bg-primaryTint text-primaryDeep px-2 py-0.5 rounded-full mb-1.5">
                Veterinário Clínico
              </span>
              <div className="text-[13.5px] font-extrabold text-ink">Clínica Vetville</div>
              <div className="text-[11px] font-semibold text-gray-500 mt-0.5">Pinheiros, São Paulo - SP · sáb, 08:00–18:00</div>
              <div className="text-[15px] font-extrabold text-primaryDeep mt-2">R$ 320</div>
            </div>
            <div className="absolute bottom-14 left-0 z-[1] w-[190px] bg-white rounded-2xl shadow-[0_20px_44px_rgba(4,45,76,0.22)] p-3.5 rotate-[3deg]">
              <span className="inline-block text-[9px] font-extrabold uppercase bg-[#e4f0f6] text-secondary px-2 py-0.5 rounded-full mb-1.5">
                Auxiliar
              </span>
              <div className="text-[13.5px] font-extrabold text-ink">São Francisco</div>
              <div className="text-[11px] font-semibold text-gray-500 mt-0.5">Moema, São Paulo - SP</div>
              <div className="text-[15px] font-extrabold text-primaryDeep mt-2">R$ 100</div>
            </div>
            <div className="absolute bottom-2.5 right-2 z-[1] w-[190px] bg-ink text-white rounded-xl px-3.5 py-2.5 text-[11.5px] font-bold flex items-center gap-1.5 shadow-[0_12px_26px_rgba(4,45,76,0.3)]">
              <CheckIcon className="w-3.5 h-3.5 text-[#baf0ea] shrink-0" /> Candidatura enviada!
            </div>
          </div>
        </div>
      </section>

      {/* ================= trust strip ================= */}
      <section className="bg-white px-5 sm:px-8 py-5 flex gap-2.5 flex-wrap justify-center border-b border-gray-100">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-gray-50 px-3.5 py-2 rounded-full">
          <StarIcon className="w-3.5 h-3.5 text-primaryDeep" /> Cadastro grátis, sem mensalidade
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-gray-50 px-3.5 py-2 rounded-full">
          <ShieldIcon className="w-3.5 h-3.5 text-primaryDeep" /> Perfis avaliados
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-gray-50 px-3.5 py-2 rounded-full">
          <LockIcon className="w-3.5 h-3.5 text-primaryDeep" /> Segurança no pagamento
        </span>
      </section>

      {/* ================= benefícios ================= */}
      <section className="bg-white px-5 sm:px-8 py-12 sm:py-14">
        <div className="max-w-[560px] mx-auto text-center mb-8">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide text-primaryDeep bg-primaryTint px-3 py-1.5 rounded-full mb-3">
            Por que ConectVet ?
          </span>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-ink mb-2 -tracking-[0.01em]">Conectando os dois lados do plantão</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Do lado de quem publica e do lado de quem se candidata, todos os detalhes pensados para facilitar a rotina veterinária.
          </p>
        </div>

        <div className="max-w-[980px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-[22px] bg-primaryTint p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-[18px]">
              <div className="w-11 h-11 rounded-2xl bg-white shadow-[0_4px_12px_rgba(4,45,76,0.08)] flex items-center justify-center text-primaryDeep shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-ink">Pra profissionais</div>
                <div className="text-xs font-bold text-gray-500">Trabalhe quando e onde fizer sentido</div>
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              {[
                { icon: <ClockIcon className="w-3.5 h-3.5" />, text: <><b className="font-extrabold text-ink">Escolha os plantões</b> que encaixam na sua agenda, sem vínculo fixo.</> },
                { icon: <CheckIcon className="w-3.5 h-3.5" />, text: <><b className="font-extrabold text-ink">Perfil verificado</b> te destaca pras clínicas antes mesmo de se candidatar.</> },
                { icon: <LockIcon className="w-3.5 h-3.5" />, text: <><b className="font-extrabold text-ink">Pagamento reservado</b> assim que você é aceito — só falta comparecer.</> },
                { icon: <StarIcon className="w-3.5 h-3.5" />, text: <>Cada <b className="font-extrabold text-ink">avaliação boa fica no seu histórico</b>, abrindo mais portas.</> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-[26px] h-[26px] rounded-lg bg-white flex items-center justify-center text-primaryDeep shrink-0 mt-px">{item.icon}</div>
                  <div className="text-[13.5px] leading-relaxed text-[#33454f] font-semibold">{item.text}</div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/vagas')} className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-extrabold px-[18px] py-2.5 rounded-xl text-white bg-primary">
              Ver vagas abertas <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-[22px] bg-[#e4f0f6] p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-[18px]">
              <div className="w-11 h-11 rounded-2xl bg-white shadow-[0_4px_12px_rgba(4,45,76,0.08)] flex items-center justify-center text-secondary shrink-0">
                <BuildingIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-ink">Pra clínicas</div>
                <div className="text-xs font-bold text-gray-500">Cobertura rápida, sem compromisso longo</div>
              </div>
            </div>
            <div className="flex flex-col gap-3.5">
              {[
                { icon: <PlusIcon className="w-3.5 h-3.5" />, text: <><b className="font-extrabold text-ink">Publique em minutos</b> e comece a receber candidaturas na hora.</> },
                { icon: <ShieldIcon className="w-3.5 h-3.5" />, text: <>Veja <b className="font-extrabold text-ink">histórico e avaliações</b> antes de aceitar alguém.</> },
                { icon: <LockIcon className="w-3.5 h-3.5" />, text: <>O valor <b className="font-extrabold text-ink">só é liberado depois que você confirma</b> a presença.</> },
                { icon: <StarIcon className="w-3.5 h-3.5" />, text: <><b className="font-extrabold text-ink">Avalie depois do plantão</b> — sua próxima escolha fica mais fácil.</> },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-[26px] h-[26px] rounded-lg bg-white flex items-center justify-center text-secondary shrink-0 mt-px">{item.icon}</div>
                  <div className="text-[13.5px] leading-relaxed text-[#33454f] font-semibold">{item.text}</div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/cadastro?role=clinica')} className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-extrabold px-[18px] py-2.5 rounded-xl text-white bg-secondary">
              Publicar uma vaga <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= como funciona ================= */}
      <section className="bg-[#eef7f6] px-5 sm:px-8 py-12 sm:py-14">
        <div className="max-w-[560px] mx-auto text-center mb-8">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide text-primaryDeep bg-white px-3 py-1.5 rounded-full mb-3">Passo a passo</span>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-ink -tracking-[0.01em]">Como funciona, dos dois lados</h2>
        </div>
        <div className="max-w-[980px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-ink mb-4"><span className="w-2 h-2 rounded-full bg-primary" />Profissional</div>
            {[
              ['Encontre um plantão', 'Filtre por cidade, data e categoria.'],
              ['Candidate-se em 1 clique', 'A clínica recebe sua candidatura na hora.'],
              ['Confirme e receba', 'Pagamento garantido assim que você é aceito.'],
            ].map(([title, desc], i) => (
              <div key={title} className={`flex gap-3.5 py-3.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                <div className="w-[30px] h-[30px] rounded-[10px] bg-primary text-white flex items-center justify-center text-[13px] font-extrabold shrink-0">{i + 1}</div>
                <div><div className="text-[13.5px] font-extrabold text-ink mb-0.5">{title}</div><div className="text-xs text-gray-500 leading-relaxed">{desc}</div></div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-ink mb-4"><span className="w-2 h-2 rounded-full bg-secondary" />Clínica</div>
            {[
              ['Publique a vaga', 'Endereço, data, valor — pronto em minutos.'],
              ['Escolha entre os candidatos', 'Perfil e avaliações à vista antes de aceitar.'],
              ['Confirme a presença', 'Só aí o pagamento é liberado ao profissional.'],
            ].map(([title, desc], i) => (
              <div key={title} className={`flex gap-3.5 py-3.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                <div className="w-[30px] h-[30px] rounded-[10px] bg-secondary text-white flex items-center justify-center text-[13px] font-extrabold shrink-0">{i + 1}</div>
                <div><div className="text-[13.5px] font-extrabold text-ink mb-0.5">{title}</div><div className="text-xs text-gray-500 leading-relaxed">{desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= vagas em destaque ================= */}
      <section className="bg-white px-5 sm:px-8 py-12 sm:py-14">
        <div className="max-w-[560px] mx-auto text-center mb-8">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide text-primaryDeep bg-primaryTint px-3 py-1.5 rounded-full mb-3">Agora mesmo</span>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-ink mb-2 -tracking-[0.01em]">Tem plantão aberto agora</h2>
          <p className="text-sm text-gray-500">Um gostinho do que já tá disponível — a lista completa fica na aba Vagas.</p>
        </div>
        <div className="max-w-[1040px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {VAGAS_EXEMPLO.map((v) => (
            <div key={v.clinica} onClick={() => router.push('/vagas')} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 cursor-pointer hover:border-secondary/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 shrink-0">
                    <BuildingIcon className="w-4 h-4" />
                  </div>
                  <div className="text-[13.5px] font-extrabold text-ink truncate">{v.clinica}</div>
                </div>
                <div className="text-[13px] font-extrabold bg-primaryTint text-primaryDeep px-2.5 py-1 rounded-lg shrink-0">R$ {v.valor}</div>
              </div>
              <span className="inline-block text-[9px] font-extrabold uppercase bg-primaryTint text-primaryDeep px-2.5 py-1 rounded-full mb-2.5">{v.categoria}</span>
              <div className="flex flex-col gap-1.5 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#33454f]">
                  <CalendarIcon className="w-3 h-3 text-primary shrink-0" /> {v.data} · {v.horario}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#33454f]">
                  <PinIcon className="w-3 h-3 text-primary shrink-0" /> {v.local}
                </div>
              </div>
              <div className="text-center bg-primary text-white text-xs font-extrabold py-2.5 rounded-lg">Candidatar-se</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <button onClick={() => router.push('/vagas')} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primaryDeep">
            Ver todas as vagas <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* ================= marca em destaque ================= */}
      <section className="bg-white px-5 sm:px-8 pb-4 pt-0">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="w-[84px] h-[84px] rounded-[24px] bg-primary flex items-center justify-center mx-auto mb-5 shadow-[0_14px_30px_rgba(0,161,154,0.28)] overflow-hidden">
            <img src="/logo.svg" alt="" className="w-[58%] h-[58%] object-contain" />
          </div>
          <img src="/logo_escrita.svg" alt="ConectVet" className="w-[min(360px,80%)] mx-auto mb-3.5" />
          <p className="text-[13px] font-bold text-gray-500 max-w-[420px] mx-auto leading-relaxed">
            A marca que conecta clínicas veterinárias e profissionais — em um lugar só.
          </p>
        </div>
      </section>

      {/* ================= cta final ================= */}
      <section className="bg-white px-5 sm:px-8 pb-12 sm:pb-16 pt-6">
        <div className="max-w-[1040px] mx-auto bg-ink rounded-[28px] px-6 sm:px-10 py-11 sm:py-12 text-center relative overflow-hidden">
          <div className="relative z-[1]">
            <div className="text-xl sm:text-[25px] font-extrabold text-white mb-2">Pronto pra fazer parte?</div>
            <div className="text-[13.5px] text-white/70 mb-6">Leva menos de 2 minutos pra criar sua conta.</div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push('/cadastro?role=profissional')} className="text-[13.5px] font-extrabold px-5 py-3.5 rounded-[13px] bg-primary text-white">
                Criar conta como profissional
              </button>
              <button onClick={() => router.push('/cadastro?role=clinica')} className="text-[13.5px] font-extrabold px-5 py-3.5 rounded-[13px] bg-white/10 border-[1.5px] border-white/25 text-white">
                Criar conta como clínica
              </button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
