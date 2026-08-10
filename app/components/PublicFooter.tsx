// Fecha as páginas públicas que usam <PublicHeader /> (visitante sem conta ou
// olhando uma página compartilhada) — hoje isso é só Home e Quem somos; a
// listagem de Vagas fica sem rodapé de propósito, pra não atrapalhar o scroll
// infinito da lista. Quem está logado tem a Sidebar/ContaSidebar como chrome
// permanente e não vê isso.
export function PublicFooter() {
  return (
    <footer className="bg-paws-footer text-white">
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 pt-11 sm:pt-14 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_1fr] gap-8 sm:gap-9 pb-7 sm:pb-8">
          <div>
            <a href="/" className="inline-flex items-center gap-2.5 mb-3">
              <span className="w-[30px] h-[30px] rounded-[9px] bg-primary flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/logo.svg" alt="" className="w-[70%] h-[70%] object-contain" />
              </span>
              <span className="font-brand font-bold text-[17px] whitespace-nowrap">
                <span className="text-white">conect</span><span className="text-primaryTint">vet</span>
              </span>
            </a>
            <p className="text-[13.5px] leading-relaxed font-semibold text-white/70 max-w-[30ch]">
              Nenhuma clínica sem cobertura. Nenhum profissional sem plantão.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/40 mb-3">Para profissionais</div>
            <div className="flex flex-col gap-3 sm:gap-2.5">
              <a href="/vagas" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Ver vagas disponíveis</a>
              <a href="/cadastro?role=profissional" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Criar conta grátis</a>
              <a href="/entrar" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Entrar</a>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/40 mb-3">Para clínicas</div>
            <div className="flex flex-col gap-3 sm:gap-2.5">
              <a href="/cadastro?role=clinica" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Publicar um plantão</a>
              <a href="/entrar" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Entrar</a>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/40 mb-3">ConectVet</div>
            <div className="flex flex-col gap-3 sm:gap-2.5">
              <a href="/quem-somos" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Quem somos</a>
              <a href="mailto:conectvet.vagas@gmail.com" className="text-[14.5px] sm:text-[13.5px] font-bold text-white/80 hover:text-white hover:underline underline-offset-4 w-fit">Fale com a gente</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 flex items-center gap-4 flex-wrap">
          <span className="text-[12px] font-semibold text-white/50">© {new Date().getFullYear()} ConectVet. Todos os direitos reservados.</span>
          <a href="/politica-de-privacidade" className="text-[12px] font-bold text-white/70 hover:text-white underline underline-offset-4">
            Termos de Política de Privacidade
          </a>
        </div>
      </div>
    </footer>
  );
}
