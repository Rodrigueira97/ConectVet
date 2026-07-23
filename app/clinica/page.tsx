'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIAS, MIN_VALORES, TAXA_PLATAFORMA, ESTADOS_CIDADES, onlyDigits, buildEndereco, mapsLink, statusBadge } from '@/lib/mockData';
import { Categoria } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, PlusIcon, GridIcon, UserIcon } from '@/app/components/icons';
import { maskCEP } from '@/lib/validators';
import { VagaDetalheView, VagaDetalheData } from '@/app/components/VagaDetalhe';
import { AvaliacaoCandidatura } from '@/app/components/AvaliacaoCandidatura';
import {
  ApiError, getToken, clearSession, CATEGORIA_LABEL, CATEGORIA_VALUE,
  Vaga, Candidatura, Clinica,
  getClinicaMe, updateClinicaMe, getFeed, getMinhasVagas, criarVaga, atualizarVaga, cancelarVaga as apiCancelarVaga,
  getCandidatosDaVaga, aceitarCandidatura, recusarCandidatura, liberarPagamento as apiLiberarPagamento,
} from '@/lib/api';

type Tab = 'home' | 'criar-vaga' | 'painel' | 'candidatos' | 'pagamento' | 'perfil';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
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
  const [feed, setFeed] = useState<Vaga[]>([]);
  const [minhasVagas, setMinhasVagas] = useState<Vaga[]>([]);
  const [candidatos, setCandidatos] = useState<Candidatura[]>([]);
  const [selectedMvId, setSelectedMvId] = useState<string | null>(null);
  const [selectedCandId, setSelectedCandId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaDetalheData | null>(null);
  const [actionError, setActionError] = useState('');

  const [vagaForm, setVagaForm] = useState(vagaFormInicial);
  const [vagaCepStatus, setVagaCepStatus] = useState<CepStatus>('idle');
  const [publishing, setPublishing] = useState(false);

  const [perfilForm, setPerfilForm] = useState({ nome: '', cnpj: '' });
  const [savingPerfil, setSavingPerfil] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push('/'); return; }
    (async () => {
      try {
        const [c, f, mv] = await Promise.all([getClinicaMe(), getFeed(), getMinhasVagas()]);
        setClinica(c);
        setPerfilForm({ nome: c.nome, cnpj: c.cnpj });
        setFeed(f);
        setMinhasVagas(mv);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) { clearSession(); router.push('/'); }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (tab !== 'candidatos' || !selectedMvId) return;
    getCandidatosDaVaga(selectedMvId).then(setCandidatos).catch(() => {});
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
      const atualizado = await updateClinicaMe({ nome: perfilForm.nome });
      setClinica(atualizado);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSavingPerfil(false);
    }
  }

  const selectedMv = minhasVagas.find((m) => m.id === selectedMvId) || null;
  const selectedCand = candidatos.find((c) => c.id === selectedCandId) || null;

  if (loading || !clinica) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        accent="primary"
        subtitle="Clínica"
        items={[
          { key: 'home', label: 'Home', icon: <HomeIcon /> },
          { key: 'criar-vaga', label: 'Criar vaga', icon: <PlusIcon /> },
          { key: 'painel', label: 'Painel', icon: <GridIcon /> },
          { key: 'perfil', label: 'Perfil', icon: <UserIcon /> },
        ]}
        activeKey={tab}
        onSelect={(key) => setTab(key as Tab)}
        footerName={clinica.nome}
      />

      <main className="flex-1 overflow-y-auto">
        {vagaSelecionada ? (
          <VagaDetalheView vaga={vagaSelecionada} onBack={() => setVagaSelecionada(null)} accentClass="text-primary" />
        ) : (
        <>
        {actionError && (
          <div className="max-w-3xl mx-auto pt-6 px-8">
            <div className="text-sm font-semibold text-danger bg-red-50 rounded-lg p-3">{actionError}</div>
          </div>
        )}

        {tab === 'home' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Vagas no feed</h1>
            <p className="text-sm text-gray-500 mb-6">Visão geral das vagas publicadas na plataforma</p>
            <div className="flex flex-col gap-4">
              {feed.map((v) => {
                const local = localDaVaga(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => setVagaSelecionada({ clinica: v.clinica?.nome, categoria: CATEGORIA_LABEL[v.categoria], local, data: formatDataBR(v.data), horario: `${v.horaInicio} - ${v.horaFim}`, valor: v.valor, descricao: v.descricao || undefined })}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{CATEGORIA_LABEL[v.categoria]}</div>
                        <div className="text-lg font-extrabold mt-1">{v.clinica?.nome}</div>
                      </div>
                      <div className="bg-green-100 text-green-700 font-extrabold text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">R$ {v.valor}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>LOCAL {local}</div><div>DATA {formatDataBR(v.data)}</div><div>HORÁRIO {v.horaInicio} - {v.horaFim}</div>
                    </div>
                  </div>
                );
              })}
              {feed.length === 0 && <div className="text-sm text-gray-400">Nenhuma vaga publicada ainda.</div>}
            </div>
          </div>
        )}

        {tab === 'criar-vaga' && (
          <div className="max-w-xl mx-auto p-8">
            <div className="text-sm font-bold text-primary mb-1">{editingId ? 'Editar vaga' : 'Nova vaga'}</div>
            <h1 className="text-2xl font-extrabold mb-6">{editingId ? 'Editar vaga' : 'Nova vaga'}</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-5">
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
                <span className="text-sm font-bold">Valor (R$)</span>
                <input type="number" value={vagaForm.valor} onChange={(e) => setVagaForm((f) => ({ ...f, valor: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
                {minVal && <span className="text-xs text-gray-500">Mínimo para esta categoria: R$ {minVal}{!isNaN(valorNum) && valorNum < minVal ? ' — abaixo do mínimo' : ''}</span>}
                <span className="text-xs text-gray-500">A ConectVet retém 5% como taxa de serviço.</span>
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
              className={`mt-6 w-full py-3.5 rounded-lg font-bold text-sm ${publishDisabled || publishing ? 'bg-gray-200 text-gray-400' : 'bg-primary hover:bg-primaryDark text-white'}`}>
              {publishing ? 'Publicando...' : editingId ? 'Salvar alterações' : 'Publicar vaga'}
            </button>
          </div>
        )}

        {tab === 'painel' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Painel da clínica</h1>
            <p className="text-sm text-gray-500 mb-6">Acompanhe suas vagas publicadas e candidatos</p>
            <div className="flex flex-col gap-4">
              {minhasVagas.map((mv) => {
                const badge = statusBadge(mv.status.toLowerCase());
                const local = localDaVaga(mv);
                const pend = (mv.candidaturas || []).filter((c) => c.status === 'PENDENTE').length;
                const hired = (mv.candidaturas || []).find((c) => c.status === 'ACEITO');
                return (
                  <div
                    key={mv.id}
                    onClick={() => setVagaSelecionada({ categoria: CATEGORIA_LABEL[mv.categoria], local, data: formatDataBR(mv.data), horario: `${mv.horaInicio} - ${mv.horaFim}`, valor: mv.valor, descricao: mv.descricao || undefined })}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{CATEGORIA_LABEL[mv.categoria]}</div>
                        <div className="text-lg font-extrabold mt-1">{local}</div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>DATA {formatDataBR(mv.data)}</div><div>HORÁRIO {mv.horaInicio} - {mv.horaFim}</div><div>R$ {mv.valor}</div>
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
                          labelPropria={`Avaliar ${hired.profissional?.nome || 'profissional'}`}
                          labelOutra={`${hired.profissional?.nome || 'Profissional'} avaliou você`}
                          corBotao="bg-primary"
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
            <button onClick={() => setTab('painel')} className="text-sm font-bold text-gray-500 mb-4">← Voltar ao painel</button>
            <h1 className="text-xl font-extrabold mb-1">Candidatos — {CATEGORIA_LABEL[selectedMv.categoria]}</h1>
            <p className="text-sm text-gray-500 mb-6">{localDaVaga(selectedMv)} · {formatDataBR(selectedMv.data)}</p>
            {selectedMv.status !== 'ABERTA' && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
                {selectedMv.status === 'CANCELADA'
                  ? 'Esta vaga foi cancelada.'
                  : 'Esta vaga já tem um profissional aprovado — cada vaga permite apenas um aprovado por enquanto.'}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {candidatos.map((c) => {
                const badge = statusBadge(c.status.toLowerCase());
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-extrabold">{c.profissional?.nome}</div>
                        <div className="text-sm text-gray-500">{c.profissional && CATEGORIA_LABEL[c.profissional.funcao]} · {c.profissional?.areaAtuacao}</div>
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
            </div>
          </div>
        )}

        {tab === 'pagamento' && selectedMv && (() => {
          const bruto = parseFloat(selectedMv.valor) || 0;
          const taxa = bruto * TAXA_PLATAFORMA;
          return (
            <div className="max-w-lg mx-auto p-8">
              <div className="text-sm font-bold text-primary mb-1">Pagamento</div>
              <h1 className="text-2xl font-extrabold mb-6">Confirmar contratação</h1>
              <div className="bg-white border border-gray-200 rounded-2xl p-7">
                <div className="text-sm text-gray-500">Profissional</div>
                <div className="text-lg font-extrabold">{selectedCand?.profissional?.nome}</div>
                <div className="text-sm text-gray-500">{CATEGORIA_LABEL[selectedMv.categoria]} · {localDaVaga(selectedMv)}</div>
                <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col gap-2">
                  <div className="flex justify-between text-sm"><span>Valor do plantão</span><span className="font-bold">R$ {bruto.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm text-gray-500"><span>Taxa (5%)</span><span>- R$ {taxa.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-extrabold pt-2 border-t border-gray-200"><span>Total ao profissional</span><span>R$ {(bruto - taxa).toFixed(2)}</span></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">O valor fica retido até a clínica confirmar a presença do profissional.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setTab('painel')} className="px-5 py-3 rounded-lg border border-gray-300 text-sm font-bold">Cancelar</button>
                <button onClick={confirmarPagamento} className="px-6 py-3 rounded-lg bg-primary text-white text-sm font-bold">Confirmar pagamento</button>
              </div>
            </div>
          );
        })()}

        {tab === 'perfil' && (
          <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-6">Perfil da clínica</h1>
            <div className="bg-white border border-gray-200 rounded-2xl p-7 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">Nome / Razão social</span>
                <input value={perfilForm.nome} onChange={(e) => setPerfilForm((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">CNPJ</span>
                <input disabled value={perfilForm.cnpj} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500" />
              </label>
              <div className="text-sm text-gray-500">Endereço cadastrado: {buildEndereco(clinica) || '—'}</div>
              <button onClick={salvarPerfil} disabled={savingPerfil} className="self-start px-5 py-2.5 rounded-lg bg-primary hover:bg-primaryDark text-white text-sm font-bold disabled:opacity-60">
                {savingPerfil ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
