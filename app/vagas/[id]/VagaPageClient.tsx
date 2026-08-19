'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { formatDataBR, vagaEncerrada } from '@/lib/mockData';
import { PublicHeader } from '@/app/components/PublicHeader';
import { PublicFooter } from '@/app/components/PublicFooter';
import { ContaSidebar } from '@/app/components/ContaSidebar';
import { LoginGate } from '@/app/components/LoginGate';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';
import { VagaCardPublica } from '@/app/components/VagaCardPublica';
import { VagaDetalheSkeleton } from '@/app/components/skeletons/VagaDetalheSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { SearchIcon, WarningIcon } from '@/app/components/icons';
import { useToast } from '@/app/components/Toast';
import { useContaLogada } from '@/app/hooks/useContaLogada';
import {
  ApiError, CATEGORIA_LABEL, Candidatura, Vaga,
  candidatar as apiCandidatar, getFeed, getMinhasCandidaturas, getToken, getVaga,
} from '@/lib/api';

export default function VagaPublicaPage() {
  return (
    <Suspense fallback={<VagaDetalheSkeleton />}>
      <VagaPublicaInner />
    </Suspense>
  );
}

function VagaPublicaInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const vagaId = params.id;
  const { logged, conta } = useContaLogada();

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [minhaCandidatura, setMinhaCandidatura] = useState<Candidatura | null>(null);
  const [gateAberto, setGateAberto] = useState(false);
  const [candidatando, setCandidatando] = useState(false);
  const [outrasVagas, setOutrasVagas] = useState<Vaga[]>([]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(false);
    setErroCarregamento(false);
    getVaga(vagaId)
      .then((v) => { if (!cancelado) setVaga(v); })
      .catch((err) => {
        if (cancelado) return;
        // 404 de verdade (vaga removida/link errado) é diferente de uma falha
        // transitória de rede ou da API fora do ar — tratar as duas como "vaga
        // não encontrada" escondia o problema real por trás de uma instabilidade
        // passageira, sem dar chance de tentar de novo.
        if (err instanceof ApiError && err.status === 404) setErro(true);
        else setErroCarregamento(true);
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [vagaId, tentativa]);

  useEffect(() => {
    if (!logged) return;
    getMinhasCandidaturas()
      .then((cs) => setMinhaCandidatura(cs.find((c) => c.vagaId === vagaId) || null))
      .catch(() => {});
  }, [logged, vagaId]);

  // Outras vagas da mesma clínica — só faz sentido oferecer isso a quem
  // ainda não tem conta: quem está logado já tem o feed inteiro, filtros e
  // favoritos à disposição na própria sidebar.
  const clinicaId = vaga?.clinica?.id;
  useEffect(() => {
    if (logged !== false || !clinicaId) { setOutrasVagas([]); return; }
    let cancelado = false;
    getFeed({ clinicaId })
      .then((vs) => { if (!cancelado) setOutrasVagas(vs.filter((v) => v.id !== vagaId && !vagaEncerrada(v))); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [logged, clinicaId, vagaId]);

  // Quem chegou aqui de volta de um cadastro (ver LoginGate → /cadastro?next=)
  // ganha um empurrãozinho: toast de boas-vindas + botão de candidatar-se em
  // destaque, pra não perder o fio da meada depois de preencher o formulário todo.
  const boasVindas = searchParams.get('novaConta') === '1';
  useEffect(() => {
    if (boasVindas) toast.success('Você voltou!', { message: 'Confirme sua candidatura abaixo.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function candidatarSe() {
    if (!vaga) return;
    setCandidatando(true);
    try {
      const nova = await apiCandidatar(vaga.id);
      setMinhaCandidatura(nova);
      setGateAberto(false);
      // Sem toast.success aqui: a própria VagaDetalheView mostra a tela de
      // sucesso (carimbo + linha do tempo) assim que `actionLoading` volta a
      // false com `compatStatus === 'aplicada'` — um toast por cima seria redundante.
    } catch (err) {
      toast.error('Não foi possível enviar a candidatura', { message: err instanceof ApiError ? err.message : undefined });
    } finally {
      setCandidatando(false);
    }
  }

  function onClickCandidatar() {
    if (!getToken()) { setGateAberto(true); return; }
    candidatarSe();
  }

  // `router.back()` só funciona se essa aba já tiver uma página anterior no
  // histórico — quem chega direto por um link (WhatsApp, busca, etc.) abre
  // a vaga como primeira entrada, e "Voltar para vagas"/"Ver outras vagas
  // disponíveis" ficavam sem fazer nada. Navega direto pra rota certa em vez
  // de depender do histórico: feed público pra visitante, o próprio painel
  // pra quem já está logado.
  function onBack() {
    if (conta) router.push(conta.role === 'CLINICA' ? '/clinica' : '/profissional');
    else router.push('/vagas');
  }

  if (loading || logged === undefined || (logged && !conta)) {
    return <VagaDetalheSkeleton sidebar={logged === true} outrasVagas={logged === false} />;
  }

  if (erro || erroCarregamento || !vaga) {
    return (
      <div className="min-h-screen bg-paws">
        <PublicHeader />
        <div className="max-w-[720px] mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm p-10">
            {erroCarregamento ? (
              <EmptyState
                icon={<WarningIcon className="w-6 h-6" />}
                title="Não foi possível carregar a vaga"
                description="Algo deu errado ao buscar os detalhes desse plantão. Tente de novo em instantes."
                actionLabel="Tentar novamente"
                onAction={() => setTentativa((t) => t + 1)}
              />
            ) : (
              <EmptyState
                icon={<SearchIcon className="w-6 h-6" />}
                title="Vaga não encontrada"
                description="Essa vaga pode ter sido removida, ou o link que você seguiu está incorreto."
                actionLabel="Ver vagas disponíveis"
                onAction={() => router.push('/vagas')}
              />
            )}
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const applied = !!minhaCandidatura;
  const encerrada = vagaEncerrada(vaga);
  const preenchidaPorMim = minhaCandidatura?.status === 'ACEITO';

  const actionLabel = preenchidaPorMim
    ? 'Você foi confirmado'
    : applied
      ? 'Candidatura enviada'
      : encerrada
        ? 'Vaga encerrada'
        : 'Candidatar-se';

  const detalhe = (
    <>
      <VagaDetalheView
        vaga={{
          id: vaga.id,
          clinica: vaga.clinica?.nome,
          clinicaId: vaga.clinica?.id,
          clinicaLogoUrl: vaga.clinica?.logoUrl,
          clinicaFotos: vaga.clinica?.fotosEstrutura,
          categoria: CATEGORIA_LABEL[vaga.categoria],
          codigo: vaga.codigo,
          status: vaga.status,
          rua: vaga.rua, numero: vaga.numero, complemento: vaga.complemento,
          bairro: vaga.bairro, cidade: vaga.cidade, estado: vaga.estado,
          data: vaga.data, horaInicio: vaga.horaInicio, horaFim: vaga.horaFim,
          valor: vaga.valor, descricao: vaga.descricao,
          notaMedia: vaga.clinica?.notaMedia, totalAvaliacoes: vaga.clinica?.totalAvaliacoes,
        }}
        onBack={onBack}
        actionLabel={actionLabel}
        actionDisabled={applied || encerrada}
        actionLoading={candidatando}
        onAction={onClickCandidatar}
        preenchidaPorMim={preenchidaPorMim}
        compatStatus={applied && !preenchidaPorMim ? 'aplicada' : undefined}
        // Visitante sem conta continua indo direto pro LoginGate (onClickCandidatar cuida
        // disso) — a revisão só entra depois que já sabemos quem é.
        confirmarCandidatura={!applied && !encerrada && !!logged}
        onVerCandidaturas={() => router.push('/profissional?tab=historico')}
        // Visitante sem conta sempre ganha o atalho "Ver outras vagas disponíveis"
        // ao lado do CTA, mesmo com a vaga aberta — quem já está logado tem o feed
        // inteiro na sidebar, então não precisa do atalho.
        mostrarVerOutras={logged === false}
      />

      {gateAberto && (
        <LoginGate
          vaga={{
            id: vaga.id,
            clinicaNome: vaga.clinica?.nome,
            clinicaLogoUrl: vaga.clinica?.logoUrl,
            resumo: `${CATEGORIA_LABEL[vaga.categoria]} · ${formatDataBR(vaga.data)} · ${vaga.horaInicio}–${vaga.horaFim}`,
          }}
          onClose={() => setGateAberto(false)}
          onLoginSuccess={candidatarSe}
        />
      )}
    </>
  );

  // Quem chegou aqui logado (ex.: pelo perfil público de uma clínica)
  // mantém a sidebar do app em vez de trocar pro cabeçalho público.
  if (conta) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <ContaSidebar conta={conta} />
        <main className="flex-1 overflow-y-auto bg-paws">{detalhe}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />
      {detalhe}
      {outrasVagas.length > 0 && (
        <div className="max-w-[1080px] mx-auto px-8 pb-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="text-[15px] font-extrabold text-ink mb-3">Outras vagas de {vaga.clinica?.nome}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {outrasVagas.map((v) => (
                <VagaCardPublica key={v.id} vaga={v} />
              ))}
            </div>
          </div>
        </div>
      )}
      <PublicFooter />
    </div>
  );
}
