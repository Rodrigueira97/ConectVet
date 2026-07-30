'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIAS, MIN_VALORES, TAXA_PLATAFORMA, ESTADOS_CIDADES, onlyDigits, buildEndereco, mapsLink, statusBadge } from '@/lib/mockData';
import { Categoria } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, PlusIcon, GridIcon, UserIcon, BuildingIcon, CloseIcon, PinIcon } from '@/app/components/icons';
import { maskCEP, maskTelefone } from '@/lib/validators';
import { VagaDetalheView, VagaDetalheData } from '@/app/components/VagaDetalhe';
import { AvaliacaoCandidatura } from '@/app/components/AvaliacaoCandidatura';
import { FeedPageSkeleton } from '@/app/components/skeletons/FeedPageSkeleton';
import { CardSkeleton } from '@/app/components/skeletons/CardSkeleton';
import { RatingBadge } from '@/app/components/RatingBadge';
import { NotificationBell } from '@/app/components/NotificationBell';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL, CATEGORIA_VALUE,
  Vaga, Candidatura, Clinica, Avaliacao,
  getClinicaMe, updateClinicaMe, getMinhasVagas, criarVaga, atualizarVaga, cancelarVaga as apiCancelarVaga,
  getCandidatosDaVaga, aceitarCandidatura, recusarCandidatura, liberarPagamento as apiLiberarPagamento,
  getAvaliacoesPorCandidatura, uploadArquivo, uploadArquivos,
} from '@/lib/api';

type Tab = 'home' | 'criar-vaga' | 'painel' | 'candidatos' | 'pagamento' | 'perfil';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

function perfilFormFromClinica(c: Clinica) {
  return {
    nome: c.nome, cnpj: c.cnpj, telefone: c.telefone || '',
    cep: c.cep || '', estado: c.estado, cidade: c.cidade, bairro: c.bairro || '', rua: c.rua, numero: c.numero, complemento: c.complemento || '',
  };
}

function formatDataBR(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function localDaVaga(v: { rua: string; numero: string; complemento?: string | null; bairro?: string | null; cidade: string; estado: string }) {
  return buildEndereco({ rua: v.rua, numero: v.numero, complemento: v.complemento || undefined, bairro: v.bairro || undefined, cidade: v.cidade, estado: v.estado });
}

const vagaFormInicial = {
  outroEndereco: false, cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  data: '', horaInicio: '', horaFim: '', valor: '', categoria: '' as Categoria | '', descricao: '',
};

export default function ClinicaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [minhasVagas, setMinhasVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidatura[]>([]);
  const [candidatosLoading, setCandidatosLoading] = useState(false);
  const [avaliacoesPorCandidatura, setAvaliacoesPorCandidatura] = useState<Record<string, Avaliacao[]>>({});
  const [selectedMvId, setSelectedMvId] = useState<string | null>(null);
  const [selectedCandId, setSelectedCandId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaDetalheData | null>(null);
  const [actionError, setActionError] = useState('');

  const [vagaForm, setVagaForm] = useState(vagaFormInicial);
  const [vagaCepStatus, setVagaCepStatus] = useState<CepStatus>('idle');
  const [publishing, setPublishing] = useState(false);

  const [perfilForm, setPerfilForm] = useState({
    nome: '', cnpj: '', telefone: '',
    cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
  });
  const [perfilCepStatus, setPerfilCepStatus] = useState<CepStatus>('idle');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFotos, setUploadingFotos] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    (async () => {
      try {
        const [c, mv] = await Promise.all([getClinicaMe(), getMinhasVagas()]);
        setClinica(c);
        setPerfilForm(perfilFormFromClinica(c));
        setMinhasVagas(mv);

        const hiredIds = mv
          .filter((v) => v.status === 'CONCLUIDA')
          .map((v) => v.candidaturas?.find((cand) => cand.status === 'ACEITO')?.id)
          .filter((id): id is string => !!id);
        const pares = await Promise.all(hiredIds.map(async (id) => [id, await getAvaliacoesPorCandidatura(id)] as const));
        setAvaliacoesPorCandidatura(Object.fromEntries(pares));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (tab !== 'candidatos' || !selectedMvId) return;
    setCandidatosLoading(true);
    getCandidatosDaVaga(selectedMvId).then(setCandidatos).catch(() => {}).finally(() => setCandidatosLoading(false));
  }, [tab, selectedMvId]);

  async function refreshMinhasVagas() {
    setMinhasVagas(await getMinhasVagas());
  }

  async function buscarCepVaga(cep: string) {
    setVagaCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setVagaCepStatus('error'); return; }
      setVagaForm((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      setVagaCepStatus('success');
    } catch {
      setVagaCepStatus('error');
    }
  }

  function onVagaCepChange(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    setVagaForm((f) => ({ ...f, cep: d }));
    setVagaCepStatus('idle');
    if (d.length === 8) buscarCepVaga(d);
  }

  async function buscarCepPerfil(cep: string) {
    setPerfilCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { setPerfilCepStatus('error'); return; }
      setPerfilForm((f) => ({
        ...f,
        rua: data.logradouro || f.rua,
        bairro: data.bairro || f.bairro,
        cidade: data.localidade || f.cidade,
        estado: data.uf || f.estado,
      }));
      setPerfilCepStatus('success');
    } catch {
      setPerfilCepStatus('error');
    }
  }

  function onPerfilCepChange(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    setPerfilForm((f) => ({ ...f, cep: d }));
    setPerfilCepStatus('idle');
    if (d.length === 8) buscarCepPerfil(d);
  }

  const enderecoParaExibir = vagaForm.outroEndereco
    ? buildEndereco(vagaForm)
    : clinica ? buildEndereco(clinica) : '';
  const publishDisabled = vagaForm.outroEndereco
    ? (!vagaForm.rua || !vagaForm.numero || !vagaForm.cidade || !vagaForm.estado)
    : !clinica?.rua;

  const minVal = vagaForm.categoria ? MIN_VALORES[vagaForm.categoria] : undefined;
  const valorNum = parseFloat(vagaForm.valor);
  let horaLabel = '';
  if (vagaForm.horaInicio && vagaForm.horaFim) {
    const [h1, m1] = vagaForm.horaInicio.split(':').map(Number);
    const [h2, m2] = vagaForm.horaFim.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24;
    horaLabel = `Duração: ${diff.toFixed(1)}h${diff > 12 ? ' — excede o máximo de 12h' : ''}`;
  }

  async function publicarVaga() {
    if (publishDisabled || !vagaForm.categoria || !clinica) return;
    setPublishing(true);
    setActionError('');
    const endereco = vagaForm.outroEndereco
      ? { cep: vagaForm.cep || undefined, estado: vagaForm.estado, cidade: vagaForm.cidade, bairro: vagaForm.bairro || undefined, rua: vagaForm.rua, numero: vagaForm.numero, complemento: vagaForm.complemento || undefined }
      : { cep: clinica.cep || undefined, estado: clinica.estado, cidade: clinica.cidade, bairro: clinica.bairro || undefined, rua: clinica.rua, numero: clinica.numero, complemento: clinica.complemento || undefined };
    const payload = {
      categoria: CATEGORIA_VALUE[vagaForm.categoria],
      ...endereco,
      data: vagaForm.data,
      horaInicio: vagaForm.horaInicio,
      horaFim: vagaForm.horaFim,
      valor: vagaForm.valor,
      descricao: vagaForm.descricao || undefined,
    };
    try {
      if (editingId) {
        await atualizarVaga(editingId, payload);
        setEditingId(null);
      } else {
        await criarVaga(payload);
      }
      setVagaForm(vagaFormInicial);
      setVagaCepStatus('idle');
      await refreshMinhasVagas();
      setTab('painel');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível publicar a vaga.');
    } finally {
      setPublishing(false);
    }
  }

  function editarVaga(mv: Vaga) {
    setEditingId(mv.id);
    setVagaForm({
      outroEndereco: true,
      cep: mv.cep || '', estado: mv.estado, cidade: mv.cidade, bairro: mv.bairro || '', rua: mv.rua, numero: mv.numero, complemento: mv.complemento || '',
      data: mv.data.slice(0, 10), horaInicio: mv.horaInicio, horaFim: mv.horaFim, valor: mv.valor, categoria: CATEGORIA_LABEL[mv.categoria] as Categoria, descricao: mv.descricao || '',
    });
    setVagaCepStatus('idle');
    setTab('criar-vaga');
  }

  async function cancelarVaga(id: string) {
    setActionError('');
    try {
      await apiCancelarVaga(id);
      await refreshMinhasVagas();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível cancelar a vaga.');
    }
  }

  function aceitarCandidato(mvId: string, candId: string) {
    const mv = minhasVagas.find((m) => m.id === mvId);
    if (!mv || mv.status !== 'ABERTA') return; // cada vaga só pode ter um profissional aprovado
    setSelectedMvId(mvId); setSelectedCandId(candId); setTab('pagamento');
  }

  async function recusarCandidato(candId: string) {
    setActionError('');
    try {
      await recusarCandidatura(candId);
      if (selectedMvId) setCandidatos(await getCandidatosDaVaga(selectedMvId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível recusar o candidato.');
    }
  }

  async function confirmarPagamento() {
    if (!selectedCandId) return;
    setActionError('');
    try {
      await aceitarCandidatura(selectedCandId);
      await refreshMinhasVagas();
      setTab('painel');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível confirmar o pagamento.');
    }
  }

  async function handleLiberarPagamento(pagamentoId: string) {
    setActionError('');
    try {
      await apiLiberarPagamento(pagamentoId);
      await refreshMinhasVagas();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível liberar o pagamento.');
    }
  }

  async function salvarPerfil() {
    setSavingPerfil(true);
    setActionError('');
    try {
      const atualizado = await updateClinicaMe({
        nome: perfilForm.nome,
        telefone: onlyDigits(perfilForm.telefone) || undefined,
        cep: perfilForm.cep || undefined,
        estado: perfilForm.estado,
        cidade: perfilForm.cidade,
        bairro: perfilForm.bairro || undefined,
        rua: perfilForm.rua,
        numero: perfilForm.numero,
        complemento: perfilForm.complemento || undefined,
      });
      setClinica(atualizado);
      setPerfilForm(perfilFormFromClinica(atualizado));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSavingPerfil(false);
    }
  }

  async function handleLogoChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setActionError('');
    try {
      const logoUrl = await uploadArquivo(file);
      const atualizado = await updateClinicaMe({ logoUrl });
      setClinica(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível enviar a logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleFotosAdd(files: FileList | null) {
    if (!files || !files.length || !clinica) return;
    const vagas = 3 - clinica.fotosEstrutura.length;
    if (vagas <= 0) return;
    setUploadingFotos(true);
    setActionError('');
    try {
      const novasUrls = await uploadArquivos(Array.from(files).slice(0, vagas));
      const fotosEstrutura = [...clinica.fotosEstrutura, ...novasUrls.map((url) => ({ url, descricao: '' }))];
      const atualizado = await updateClinicaMe({ fotosEstrutura });
      setClinica(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível enviar as fotos.');
    } finally {
      setUploadingFotos(false);
    }
  }

  async function handleFotoRemover(url: string) {
    if (!clinica) return;
    const fotosEstrutura = clinica.fotosEstrutura.filter((f) => f.url !== url);
    try {
      const atualizado = await updateClinicaMe({ fotosEstrutura });
      setClinica(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível remover a foto.');
    }
  }

  function handleFotoDescricaoChange(url: string, descricao: string) {
    if (!clinica) return;
    setClinica({ ...clinica, fotosEstrutura: clinica.fotosEstrutura.map((f) => (f.url === url ? { ...f, descricao } : f)) });
  }

  async function handleFotoDescricaoSalvar(url: string) {
    if (!clinica) return;
    try {
      const atualizado = await updateClinicaMe({ fotosEstrutura: clinica.fotosEstrutura });
      setClinica(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar a descrição.');
    }
  }

  const selectedMv = minhasVagas.find((m) => m.id === selectedMvId) || null;
  const selectedCand = candidatos.find((c) => c.id === selectedCandId) || null;
  const pendingTotal = minhasVagas.reduce((sum, mv) => sum + (mv.candidaturas || []).filter((c) => c.status === 'PENDENTE').length, 0);

  if (loading || !clinica) {
    return <FeedPageSkeleton sidebarItems={4} />;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="primary"
        subtitle="Clínica"
        items={[
          { key: 'home', label: 'Home', icon: <HomeIcon /> },
          { key: 'criar-vaga', label: 'Criar vaga', icon: <PlusIcon /> },
          { key: 'painel', label: 'Painel', icon: <GridIcon />, count: pendingTotal },
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={clinica.nome}
        footerSubtitle="Conta clínica"
        footerPhotoUrl={clinica.logoUrl}
        footerIcon="building"
      />

      <div className="fixed top-2.5 right-14 md:top-5 md:right-6 z-30">
        <NotificationBell />
      </div>

      <main className="flex-1 overflow-y-auto bg-paws">
        {vagaSelecionada ? (
          <VagaDetalheView vaga={vagaSelecionada} onBack={() => setVagaSelecionada(null)} />
        ) : (
        <>
        {actionError && (
          <div className="max-w-3xl mx-auto pt-6 px-8">
            <div className="text-sm font-semibold text-danger bg-red-50 rounded-lg p-3">{actionError}</div>
          </div>
        )}

        {tab === 'home' && (() => {
          const vagasAtivas = minhasVagas.filter((v) => v.status === 'ABERTA').length;
          const consideradas = minhasVagas.filter((v) => v.status !== 'CANCELADA');
          const preenchidas = consideradas.filter((v) => v.status === 'PREENCHIDA' || v.status === 'CONCLUIDA').length;
          const taxaPreenchimento = consideradas.length ? Math.round((preenchidas / consideradas.length) * 100) : null;

          const avaliacoesRecebidas = Object.values(avaliacoesPorCandidatura).flat().filter((a) => a.autor === 'PROFISSIONAL');
          const notaMedia = avaliacoesRecebidas.length
            ? avaliacoesRecebidas.reduce((soma, a) => soma + a.nota, 0) / avaliacoesRecebidas.length
            : null;

          const retidoTotal = minhasVagas.reduce((soma, v) => soma + (v.pagamento?.status === 'RETIDO' ? Number(v.pagamento.valorBruto) : 0), 0);

          const candidatosPendentes = minhasVagas
            .filter((v) => v.status === 'ABERTA')
            .flatMap((v) => (v.candidaturas || []).filter((c) => c.status === 'PENDENTE').map((c) => ({ candidatura: c, vaga: v })));

          return (
            <div className="max-w-3xl mx-auto p-8">
              <h1 className="text-2xl font-extrabold mb-1 text-white">Painel</h1>
              <p className="text-sm text-white/85 mb-6">Como sua clínica está indo na plataforma</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{vagasAtivas}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Vagas ativas</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{taxaPreenchimento !== null ? `${taxaPreenchimento}%` : '—'}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Taxa de preenchimento</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">{notaMedia !== null ? notaMedia.toFixed(1) : '—'}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Avaliação recebida</div>
                </div>
                <div className="bg-white rounded-2xl p-4">
                  <div className="text-xl font-extrabold text-ink">R$ {retidoTotal.toFixed(2)}</div>
                  <div className="text-[11px] font-bold text-gray-500 mt-0.5">Retido, aguardando confirmação</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-extrabold text-ink">Candidatos aguardando resposta</div>
                  {candidatosPendentes.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full">{candidatosPendentes.length}</span>
                  )}
                </div>
                {candidatosPendentes.length === 0 ? (
                  <div className="text-sm text-gray-400 mt-2">Nenhum candidato pendente no momento.</div>
                ) : (
                  <div className="flex flex-col">
                    {candidatosPendentes.map(({ candidatura: c, vaga: v }) => (
                      <div key={c.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
                        <div className="w-8 h-8 rounded-full bg-primaryTint text-primaryDeep flex items-center justify-center text-xs font-extrabold shrink-0">
                          {(c.profissional?.nome || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-ink truncate">{c.profissional?.nome}</div>
                          <div className="text-[12px] text-gray-500 truncate">{c.profissional && CATEGORIA_LABEL[c.profissional.funcao]} · vaga de {formatDataBR(v.data)}</div>
                        </div>
                        <button
                          onClick={() => { setSelectedMvId(v.id); setTab('candidatos'); }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shrink-0"
                        >
                          Ver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {tab === 'criar-vaga' && (
          <div className="max-w-xl mx-auto p-8">
            <div className="text-sm font-bold text-primaryTint mb-1">{editingId ? 'Editar vaga' : 'Nova vaga'}</div>
            <h1 className="text-2xl font-extrabold mb-6 text-white">{editingId ? 'Editar vaga' : 'Nova vaga'}</h1>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 flex flex-col gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={vagaForm.outroEndereco} onChange={(e) => setVagaForm((f) => ({ ...f, outroEndereco: e.target.checked }))} />
                Usar um endereço diferente do cadastro da clínica
              </label>
              {vagaForm.outroEndereco && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-bold">CEP</span>
                    <input
                      value={maskCEP(vagaForm.cep)}
                      onChange={(e) => onVagaCepChange(e.target.value)}
                      placeholder="00000-000"
                      className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none max-w-[200px]"
                    />
                    {vagaCepStatus === 'loading' && <span className="text-xs text-gray-400">Buscando endereço...</span>}
                    {vagaCepStatus === 'error' && <span className="text-xs font-semibold text-danger">CEP não encontrado. Preencha o endereço manualmente.</span>}
                    <a
                      href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary w-fit"
                    >
                      Não sei o CEP
                    </a>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Estado (UF) *</span>
                    <select value={vagaForm.estado} onChange={(e) => setVagaForm((f) => ({ ...f, estado: e.target.value, cidade: '' }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                      <option value="">Selecione...</option>
                      {withCurrent(Object.keys(ESTADOS_CIDADES), vagaForm.estado).map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Cidade *</span>
                    <select disabled={!vagaForm.estado} value={vagaForm.cidade} onChange={(e) => setVagaForm((f) => ({ ...f, cidade: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                      <option value="">Selecione...</option>
                      {withCurrent(ESTADOS_CIDADES[vagaForm.estado] || [], vagaForm.cidade).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Bairro</span>
                    <input value={vagaForm.bairro} onChange={(e) => setVagaForm((f) => ({ ...f, bairro: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Rua *</span>
                    <input value={vagaForm.rua} onChange={(e) => setVagaForm((f) => ({ ...f, rua: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Número *</span>
                    <input value={vagaForm.numero} onChange={(e) => setVagaForm((f) => ({ ...f, numero: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Complemento</span>
                    <input value={vagaForm.complemento} onChange={(e) => setVagaForm((f) => ({ ...f, complemento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                </div>
              )}
              {enderecoParaExibir && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  {enderecoParaExibir} — <a href={mapsLink(enderecoParaExibir)} target="_blank" className="font-bold">ver no Google Maps</a>
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Data do serviço</span>
                <input type="date" value={vagaForm.data} onChange={(e) => setVagaForm((f) => ({ ...f, data: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">Início</span>
                  <input type="time" value={vagaForm.horaInicio} onChange={(e) => setVagaForm((f) => ({ ...f, horaInicio: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold">Fim</span>
                  <input type="time" value={vagaForm.horaFim} onChange={(e) => setVagaForm((f) => ({ ...f, horaFim: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                </label>
              </div>
              {horaLabel && <div className="text-xs font-mono text-gray-500">{horaLabel}</div>}
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Categoria</span>
                <select value={vagaForm.categoria} onChange={(e) => setVagaForm((f) => ({ ...f, categoria: e.target.value as Categoria }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                  <option value="">Selecione...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Valor a pagar ao profissional (R$)</span>
                <input type="number" value={vagaForm.valor} onChange={(e) => setVagaForm((f) => ({ ...f, valor: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                {minVal && <span className="text-xs text-gray-500">Mínimo para esta categoria: R$ {minVal}{!isNaN(valorNum) && valorNum < minVal ? ' — abaixo do mínimo' : ''}</span>}
                {!isNaN(valorNum) && valorNum > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 flex flex-col gap-1">
                    <div className="flex justify-between"><span>Profissional recebe</span><span className="font-bold">R$ {valorNum.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Taxa da ConectVet (5%)</span><span>+ R$ {(valorNum * TAXA_PLATAFORMA).toFixed(2)}</span></div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-gray-200"><span>Você paga no total</span><span>R$ {(valorNum * (1 + TAXA_PLATAFORMA)).toFixed(2)}</span></div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">A ConectVet soma 5% de taxa de serviço sobre este valor.</span>
                )}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Descrição (opcional)</span>
                <textarea
                  value={vagaForm.descricao}
                  onChange={(e) => setVagaForm((f) => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  placeholder="Detalhes sobre a vaga, requisitos, observações..."
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                />
              </label>
            </div>
            <button disabled={publishDisabled || publishing} onClick={publicarVaga}
              className={`mt-6 w-full py-3.5 rounded-lg font-bold text-sm shadow-sm ${publishDisabled || publishing ? 'bg-gray-200 text-gray-400' : 'bg-ink text-white'}`}>
              {publishing ? 'Publicando...' : editingId ? 'Salvar alterações' : 'Publicar vaga'}
            </button>
          </div>
        )}

        {tab === 'painel' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1 text-white">Painel da clínica</h1>
            <p className="text-sm text-white/85 mb-6">Acompanhe suas vagas publicadas e candidatos</p>
            <div className="flex flex-col gap-4">
              {minhasVagas.map((mv) => {
                const badge = statusBadge(mv.status.toLowerCase());
                const local = localDaVaga(mv);
                const pend = (mv.candidaturas || []).filter((c) => c.status === 'PENDENTE').length;
                const hired = (mv.candidaturas || []).find((c) => c.status === 'ACEITO');
                return (
                  <div
                    key={mv.id}
                    onClick={() => setVagaSelecionada({
                      categoria: CATEGORIA_LABEL[mv.categoria],
                      rua: mv.rua, numero: mv.numero, complemento: mv.complemento, bairro: mv.bairro, cidade: mv.cidade, estado: mv.estado,
                      data: mv.data, horaInicio: mv.horaInicio, horaFim: mv.horaFim,
                      valor: mv.valor, descricao: mv.descricao,
                    })}
                    className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{CATEGORIA_LABEL[mv.categoria]}</div>
                        <a
                          href={mapsLink(local)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-lg font-extrabold mt-1 hover:text-primary hover:underline"
                        >
                          <PinIcon className="w-4 h-4 shrink-0 text-primary" />
                          {local}
                        </a>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>Data <b className="font-bold text-gray-700">{formatDataBR(mv.data)}</b></div><div>Horário <b className="font-bold text-gray-700">{mv.horaInicio} - {mv.horaFim}</b></div><div>R$ {mv.valor}</div>
                    </div>
                    {mv.descricao && <div className="text-sm text-gray-600 mt-3">{mv.descricao}</div>}
                    <div onClick={(e) => e.stopPropagation()} className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 flex-wrap gap-2">
                      <div className="text-sm text-gray-500">{(mv.candidaturas || []).length === 0 ? 'Nenhum candidato ainda' : `${mv.candidaturas!.length} candidato(s) · ${pend} pendente(s)`}</div>
                      <div className="flex gap-2 flex-wrap">
                        {mv.status === 'ABERTA' && (
                          <>
                            <button onClick={() => editarVaga(mv)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Editar</button>
                            <button onClick={() => cancelarVaga(mv.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold text-danger">Cancelar</button>
                          </>
                        )}
                        {mv.status === 'PREENCHIDA' && mv.pagamento && mv.pagamento.status === 'RETIDO' && (
                          <button onClick={() => handleLiberarPagamento(mv.pagamento!.id)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold">Confirmar presença e liberar pagamento</button>
                        )}
                        <button onClick={() => { setSelectedMvId(mv.id); setTab('candidatos'); }} className="px-4 py-2 rounded-lg bg-secondary text-white text-sm font-bold">Ver candidatos</button>
                      </div>
                    </div>
                    {mv.status === 'CONCLUIDA' && hired && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AvaliacaoCandidatura
                          candidaturaId={hired.id}
                          autorProprio="CLINICA"
                          labelForm={`Avaliar ${hired.profissional?.nome || 'profissional'}`}
                          labelFeita={`Avaliação de ${hired.profissional?.nome || 'profissional'}`}
                          labelOutra={`${hired.profissional?.nome || 'Profissional'} avaliou você`}
                          avaliacoesIniciais={avaliacoesPorCandidatura[hired.id] || []}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {minhasVagas.length === 0 && <div className="text-sm text-gray-400">Você ainda não publicou nenhuma vaga.</div>}
            </div>
          </div>
        )}

        {tab === 'candidatos' && selectedMv && (
          <div className="max-w-2xl mx-auto p-8">
            <button onClick={() => setTab('painel')} className="text-sm font-bold text-white/80 hover:text-white mb-4">← Voltar ao painel</button>
            <h1 className="text-xl font-extrabold mb-1 text-white">Candidatos — {CATEGORIA_LABEL[selectedMv.categoria]}</h1>
            <p className="text-sm text-white/85 mb-6">{localDaVaga(selectedMv)} · {formatDataBR(selectedMv.data)}</p>
            {selectedMv.status !== 'ABERTA' && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
                {selectedMv.status === 'CANCELADA'
                  ? 'Esta vaga foi cancelada.'
                  : 'Esta vaga já tem um profissional aprovado — cada vaga permite apenas um aprovado por enquanto.'}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {candidatosLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
                  {candidatos.map((c) => {
                    const badge = statusBadge(c.status.toLowerCase());
                    return (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-extrabold">{c.profissional?.nome}</div>
                            <div className="mt-0.5"><RatingBadge notaMedia={c.profissional?.notaMedia} totalAvaliacoes={c.profissional?.totalAvaliacoes} /></div>
                            <div className="text-sm text-gray-500 mt-1">
                              {c.profissional && CATEGORIA_LABEL[c.profissional.funcao]}
                              {c.profissional?.especialidade ? ` (${c.profissional.especialidade})` : ''} · {c.profissional?.areaAtuacao}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Região: {c.profissional?.regioesAtendimento}</div>
                          </div>
                          <div className={badge.className}>{badge.label}</div>
                        </div>
                        {c.status === 'PENDENTE' && selectedMv.status === 'ABERTA' && (
                          <div className="flex gap-2 mt-4">
                            <button onClick={() => recusarCandidato(c.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Recusar</button>
                            <button onClick={() => aceitarCandidato(selectedMv.id, c.id)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-bold">Aceitar e pagar</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {candidatos.length === 0 && <div className="text-sm text-gray-400">Nenhum candidato ainda.</div>}
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'pagamento' && selectedMv && (() => {
          const valorProfissional = parseFloat(selectedMv.valor) || 0;
          const taxa = valorProfissional * TAXA_PLATAFORMA;
          const totalClinica = valorProfissional + taxa;
          return (
            <div className="max-w-lg mx-auto p-8">
              <div className="text-sm font-bold text-primaryTint mb-1">Pagamento</div>
              <h1 className="text-2xl font-extrabold mb-6 text-white">Confirmar contratação</h1>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
                <div className="text-sm text-gray-500">Profissional</div>
                <div className="text-lg font-extrabold">{selectedCand?.profissional?.nome}</div>
                <div className="text-sm text-gray-500">{CATEGORIA_LABEL[selectedMv.categoria]} · {localDaVaga(selectedMv)}</div>
                <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><span>Valor ao profissional</span><span className="font-bold">R$ {valorProfissional.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-gray-500"><span>Taxa da ConectVet (5%)</span><span>+ R$ {taxa.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-200"><span>Total que você paga</span><span>R$ {totalClinica.toFixed(2)}</span></div>
                </div>
              </div>
              <p className="text-xs text-white/85 mt-3">O valor fica retido até a clínica confirmar a presença do profissional.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setTab('painel')} className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-sm font-bold">Cancelar</button>
                <button onClick={confirmarPagamento} className="px-6 py-3 rounded-lg bg-ink text-white text-sm font-bold shadow-sm">Confirmar pagamento</button>
              </div>
            </div>
          );
        })()}

        {tab === 'perfil' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-6 text-white">Perfil da clínica</h1>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 flex flex-col gap-4">
              <div className="flex items-center gap-4 pb-2">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden shrink-0">
                  {clinica.logoUrl ? (
                    <img src={clinica.logoUrl} alt={clinica.nome} className="w-full h-full object-cover" />
                  ) : (
                    <BuildingIcon className="w-9 h-9" />
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
                  {uploadingLogo ? 'Enviando...' : 'Trocar logo'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => handleLogoChange(e.target.files)} />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Nome / Razão social</span>
                <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">CNPJ</span>
                <input disabled value={perfilForm.cnpj} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Telefone</span>
                <input
                  value={maskTelefone(perfilForm.telefone)}
                  onChange={(e) => setPerfilForm((f) => ({ ...f, telefone: onlyDigits(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm"
                />
              </label>

              <div className="pt-2 mt-2 border-t border-gray-100">
                <div className="text-sm font-extrabold text-gray-800 mb-3">Endereço</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-bold">CEP</span>
                    <input
                      value={maskCEP(perfilForm.cep)}
                      onChange={(e) => onPerfilCepChange(e.target.value)}
                      placeholder="00000-000"
                      className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none max-w-[200px]"
                    />
                    {perfilCepStatus === 'loading' && <span className="text-xs text-gray-400">Buscando endereço...</span>}
                    {perfilCepStatus === 'error' && <span className="text-xs font-semibold text-danger">CEP não encontrado. Preencha o endereço manualmente.</span>}
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Estado (UF)</span>
                    <select value={perfilForm.estado} onChange={(e) => setPerfilForm((f) => ({ ...f, estado: e.target.value, cidade: '' }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                      <option value="">Selecione...</option>
                      {withCurrent(Object.keys(ESTADOS_CIDADES), perfilForm.estado).map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Cidade</span>
                    <select disabled={!perfilForm.estado} value={perfilForm.cidade} onChange={(e) => setPerfilForm((f) => ({ ...f, cidade: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
                      <option value="">Selecione...</option>
                      {withCurrent(ESTADOS_CIDADES[perfilForm.estado] || [], perfilForm.cidade).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Bairro</span>
                    <input value={perfilForm.bairro} onChange={(e) => setPerfilForm((f) => ({ ...f, bairro: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Rua</span>
                    <input value={perfilForm.rua} onChange={(e) => setPerfilForm((f) => ({ ...f, rua: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Número</span>
                    <input value={perfilForm.numero} onChange={(e) => setPerfilForm((f) => ({ ...f, numero: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Complemento</span>
                    <input value={perfilForm.complemento} onChange={(e) => setPerfilForm((f) => ({ ...f, complemento: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                  </label>
                </div>
              </div>

              <button onClick={salvarPerfil} disabled={savingPerfil} className="self-start px-5 py-2.5 rounded-lg bg-ink text-white text-sm font-bold shadow-sm disabled:opacity-60">
                {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 mt-6 flex flex-col gap-4">
              <div>
                <div className="text-sm font-extrabold text-gray-800">Fotos da clínica</div>
                <div className="text-xs text-gray-400 mt-0.5">Opcional, até 3 fotos ({clinica.fotosEstrutura.length}/3)</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {clinica.fotosEstrutura.map((foto) => (
                  <div key={foto.url} className="flex flex-col gap-1.5">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                      <img src={foto.url} alt={foto.descricao || 'Foto da clínica'} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleFotoRemover(foto.url)}
                        aria-label="Remover foto"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={foto.descricao || ''}
                      onChange={(e) => handleFotoDescricaoChange(foto.url, e.target.value)}
                      onBlur={() => handleFotoDescricaoSalvar(foto.url)}
                      placeholder="Descrição (opcional)"
                      className="px-2 py-1 rounded-md border border-gray-200 text-xs outline-none"
                    />
                  </div>
                ))}
                {clinica.fotosEstrutura.length < 3 && (
                  <label className="cursor-pointer aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                    <PlusIcon className="w-5 h-5" />
                    <span className="text-xs font-bold">{uploadingFotos ? 'Enviando...' : 'Adicionar'}</span>
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingFotos} onChange={(e) => handleFotosAdd(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
