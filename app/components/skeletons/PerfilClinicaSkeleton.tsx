import { Skeleton } from './Skeleton';
import { CardSkeleton } from './CardSkeleton';
import { SidebarSkeleton } from './SidebarSkeleton';

// Mesmo formato do PerfilClinicaView (ver PerfilClinica.tsx): cabeçalho
// colorido com avatar + selo, cartões de estatística flutuando por cima da
// base dele, painel com sub-blocos (endereço/fotos/avaliações) e o painel
// de vagas abertas. `sidebar` espelha a sidebar de app logado (ver
// app/clinicas/[id]/page.tsx) — só entra quando já sabemos que quem abriu
// o perfil está logado, pra não trocar de layout no meio do carregamento.
export function PerfilClinicaSkeleton({ sidebar = false }: { sidebar?: boolean }) {
  const conteudo = (
    <div className="max-w-[1080px] mx-auto p-8">
      <Skeleton light className="w-16 h-4 mb-4" />

      <div className="relative rounded-3xl p-5 sm:p-6 pb-10 sm:pb-12 shadow-lg bg-paws-header-open">
        <Skeleton light className="absolute top-4 right-4 sm:top-5 sm:right-6 w-40 h-7 rounded-full" />
        <div className="flex items-center gap-3.5 pr-24 sm:pr-40">
          <Skeleton light className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-2xl shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton light className="w-40 h-6" />
            <Skeleton light className="w-28 h-4" />
            <Skeleton light className="w-56 h-3.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mx-1 sm:mx-2 -mt-7 sm:-mt-8 mb-5 relative z-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 py-3.5 flex flex-col items-center gap-2">
            <Skeleton className="w-10 h-6" />
            <Skeleton className="w-24 h-2.5" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
        <Skeleton className="w-32 h-4 mb-2" />
        <Skeleton className="w-full h-3 mb-1.5" />
        <Skeleton className="w-5/6 h-3 mb-4" />

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-5">
            <Skeleton className="w-20 h-2.5 mb-2" />
            <Skeleton className="w-3/4 h-3.5 mb-2" />
            <Skeleton className="w-32 h-3" />
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <Skeleton className="w-28 h-2.5 mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5">
            <Skeleton className="w-36 h-2.5 mb-3" />
            <Skeleton className="w-full h-3 mb-1.5" />
            <Skeleton className="w-2/3 h-3" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <Skeleton className="w-44 h-4 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
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
