import { Skeleton } from './Skeleton';
import { CardSkeleton } from './CardSkeleton';
import { SidebarSkeleton } from './SidebarSkeleton';

// Mesmo formato do VagaDetalheView (ver VagaDetalhe.tsx): botão "Voltar",
// cabeçalho colorido com chips + avatar/nome da clínica + botão de
// compartilhar, e o painel branco com o grid de valor/quando/onde. `sidebar`
// espelha a sidebar de app logado — só entra quando já sabemos que quem abriu
// a vaga está logado, pra não trocar de layout no meio do carregamento.
// `outrasVagas` liga o painel de "outras vagas da clínica" que só aparece
// pra quem chega deslogado (ver app/vagas/[id]/VagaPageClient.tsx).
export function VagaDetalheSkeleton({ sidebar = false, outrasVagas = false }: { sidebar?: boolean; outrasVagas?: boolean }) {
  const conteudo = (
    <div className="max-w-[1080px] mx-auto p-8">
      <Skeleton light className="w-36 h-4 mb-4" />

      <div className="rounded-3xl p-5 sm:p-6 mb-6 shadow-lg bg-paws-header-open">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton light className="w-16 h-6 rounded-full" />
            <Skeleton light className="w-24 h-6 rounded-full" />
          </div>
          <Skeleton light className="w-10 h-10 rounded-[11px] shrink-0" />
        </div>
        <div className="flex items-center gap-3.5">
          <Skeleton light className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton light className="w-48 h-6" />
            <Skeleton light className="w-32 h-3.5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-[18px] bg-gray-100">
              <Skeleton className="w-[34px] h-[34px] rounded-[10px] mb-3" />
              <Skeleton className="w-20 h-2.5 mb-2" />
              <Skeleton className="w-24 h-5" />
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-2xl p-5">
          <Skeleton className="w-32 h-2.5 mb-2" />
          <Skeleton className="w-3/4 h-3.5" />
        </div>
      </div>

      {outrasVagas && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <Skeleton className="w-48 h-4 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      )}
    </div>
  );

  if (sidebar) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <SidebarSkeleton />
        <main className="flex-1 overflow-y-auto bg-paws">{conteudo}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paws">
      <div className="bg-white h-[62px]" />
      {conteudo}
    </div>
  );
}
