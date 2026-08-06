'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { formatDataBR, vagaEncerrada } from '@/lib/mockData';
import { PublicHeader } from '@/app/components/PublicHeader';
import { LoginGate } from '@/app/components/LoginGate';
import { VagaDetalheView } from '@/app/components/VagaDetalhe';
import { CardSkeleton } from '@/app/components/skeletons/CardSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { SearchIcon } from '@/app/components/icons';
import { useToast } from '@/app/components/Toast';
import {
  ApiError, CATEGORIA_LABEL, Candidatura, Vaga,
  candidatar as apiCandidatar, getMinhasCandidaturas, getToken, getVaga,
} from '@/lib/api';

export default function VagaPublicaPage() {
  return (
    <Suspense fallback={<VagaPublicaSkeleton />}>
      <VagaPublicaInner />
    </Suspense>
  );
}

function VagaPublicaSkeleton() {
  return (
    <div className="min-h-screen bg-paws">
      <div className="bg-white h-[62px]" />
      <div className="max-w-[720px] mx-auto p-8"><CardSkeleton /></div>
    </div>
  );
}

function VagaPublicaInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const vagaId = params.id;

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [minhaCandidatura, setMinhaCandidatura] = useState<Candidatura | null>(null);
  const [gateAberto, setGateAberto] = useState(false);
  const [candidatando, setCandidatando] = useState(false);
  const [logado, setLogado] = useState(false);

  // localStorage não existe no server — só sabemos se tem sessão depois de montar.
  useEffect(() => { setLogado(!!getToken()); }, []);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(false);
    getVaga(vagaId)
      .then((v) => { if (!cancelado) setVaga(v); })
      .catch(() => { if (!cancelado) setErro(true); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [vagaId]);

  useEffect(() => {
    if (!logado) return;
    getMinhasCandidaturas()
      .then((cs) => setMinhaCandidatura(cs.find((c) => c.vagaId === vagaId) || null))
      .catch(() => {});
  }, [logado, vagaId]);

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
      toast.success('Candidatura enviada', { message: `${vaga.clinica?.nome || 'A clínica'} vai te avisar por aqui assim que responder.` });
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

  if (loading) return <VagaPublicaSkeleton />;

  if (erro || !vaga) {
    return (
      <div className="min-h-screen bg-paws">
        <PublicHeader />
        <div className="max-w-[720px] mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-sm p-10">
            <EmptyState
              icon={<SearchIcon className="w-6 h-6" />}
              title="Vaga não encontrada"
              description="Essa vaga pode ter sido removida, ou o link que você seguiu está incorreto."
              actionLabel="Ver vagas disponíveis"
              onAction={() => router.push('/')}
            />
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />
      <VagaDetalheView
        vaga={{
          clinica: vaga.clinica?.nome,
          clinicaId: vaga.clinica?.id,
          clinicaLogoUrl: vaga.clinica?.logoUrl,
          clinicaFotos: vaga.clinica?.fotosEstrutura,
          categoria: CATEGORIA_LABEL[vaga.categoria],
          status: vaga.status,
          rua: vaga.rua, numero: vaga.numero, complemento: vaga.complemento,
          bairro: vaga.bairro, cidade: vaga.cidade, estado: vaga.estado,
          data: vaga.data, horaInicio: vaga.horaInicio, horaFim: vaga.horaFim,
          valor: vaga.valor, descricao: vaga.descricao,
          notaMedia: vaga.clinica?.notaMedia, totalAvaliacoes: vaga.clinica?.totalAvaliacoes,
        }}
        onBack={() => router.push('/')}
        actionLabel={actionLabel}
        actionDisabled={applied || encerrada}
        actionLoading={candidatando}
        onAction={onClickCandidatar}
        preenchidaPorMim={preenchidaPorMim}
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
    </div>
  );
}
