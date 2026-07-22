'use client';
import { useMemo, useState } from 'react';
import {
  FEED_MOCK, MINHAS_VAGAS_MOCK, PAGAMENTOS_MOCK, CATEGORIAS, MIN_VALORES, TAXA_PLATAFORMA,
  ESTADOS_CIDADES, onlyDigits, buildEndereco, mapsLink, statusBadge,
} from '@/lib/mockData';
import { MinhaVaga, Pagamento, Avaliacao } from '@/lib/types';
import { Sidebar } from '@/app/components/Sidebar';
import { HomeIcon, PlusIcon, GridIcon, UserIcon } from '@/app/components/icons';
import { maskCEP } from '@/lib/validators';
import { VagaDetalheView, VagaDetalheData } from '@/app/components/VagaDetalhe';

type Tab = 'home' | 'criar-vaga' | 'painel' | 'candidatos' | 'pagamento' | 'perfil';
type CepStatus = 'idle' | 'loading' | 'success' | 'error';

function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

export default function ClinicaPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [clinica, setClinica] = useState({
    nome: 'Clínica VetSaúde Ltda', cnpj: '', responsavel: '', cep: '05426-200',
    estado: 'SP', cidade: 'São Paulo', bairro: 'Pinheiros', rua: 'Rua dos Pinheirais', numero: '450', complemento: '',
  });
  const [minhasVagas, setMinhasVagas] = useState<MinhaVaga[]>(MINHAS_VAGAS_MOCK);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(PAGAMENTOS_MOCK);
  const [avaliacoesProfissional, setAvaliacoesProfissional] = useState<Record<string, Avaliacao>>({});
  const [selectedMvId, setSelectedMvId] = useState<string | null>(null);
  const [selectedCandId, setSelectedCandId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaDetalheData | null>(null);

  const [vagaForm, setVagaForm] = useState({
    outroEndereco: false, cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '',
    data: '', horaInicio: '', horaFim: '', valor: '', categoria: '', descricao: '',
  });
  const [vagaCepStatus, setVagaCepStatus] = useState<CepStatus>('idle');

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

  const enderecoCompleto = vagaForm.outroEndereco ? buildEndereco(vagaForm) : buildEndereco(clinica);
  const publishDisabled = vagaForm.outroEndereco
    ? (!vagaForm.rua || !vagaForm.numero || !vagaForm.cidade || !vagaForm.estado)
    : !clinica.rua;

  const minVal = MIN_VALORES[vagaForm.categoria as keyof typeof MIN_VALORES];
  const valorNum = parseFloat(vagaForm.valor);
  let horaLabel = '';
  if (vagaForm.horaInicio && vagaForm.horaFim) {
    const [h1, m1] = vagaForm.horaInicio.split(':').map(Number);
    const [h2, m2] = vagaForm.horaFim.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24;
    horaLabel = `Duração: ${diff.toFixed(1)}h${diff > 12 ? ' — excede o máximo de 12h' : ''}`;
  }

  function publicarVaga() {
    if (publishDisabled) return;
    const local = enderecoCompleto;
    const horario = vagaForm.horaInicio && vagaForm.horaFim ? `${vagaForm.horaInicio} - ${vagaForm.horaFim}` : '';
    if (editingId) {
      setMinhasVagas((prev) => prev.map((m) => m.id !== editingId ? m : {
        ...m, categoria: (vagaForm.categoria as any) || m.categoria, valor: vagaForm.valor || m.valor,
        local: local || m.local, horario: horario || m.horario, descricao: vagaForm.descricao || m.descricao,
      }));
      setEditingId(null);
    } else {
      setMinhasVagas((prev) => [{
        id: 'mv' + Date.now(), categoria: vagaForm.categoria as any, local, horario, valor: vagaForm.valor,
        descricao: vagaForm.descricao, data: vagaForm.data, status: 'aberta', candidatos: [],
      }, ...prev]);
    }
    setVagaForm({ outroEndereco: false, cep: '', estado: '', cidade: '', bairro: '', rua: '', numero: '', complemento: '', data: '', horaInicio: '', horaFim: '', valor: '', categoria: '', descricao: '' });
    setVagaCepStatus('idle');
    setTab('painel');
  }

  function editarVaga(mv: MinhaVaga) {
    const [horaInicio, horaFim] = (mv.horario || '').split(' - ').map((x) => x.trim());
    const parts = (mv.local || '').split(',').map((x) => x.trim());
    let bairro = '', cidade = '', estado = '';
    if (parts.length >= 2) {
      bairro = parts[0];
      const cs = parts[1].split(' - ').map((x) => x.trim());
      cidade = cs[0] || ''; estado = cs[1] || '';
    }
    setEditingId(mv.id);
    setVagaForm({ outroEndereco: true, cep: '', estado, cidade, bairro, rua: '', numero: '', complemento: '', data: '', horaInicio: horaInicio || '', horaFim: horaFim || '', valor: mv.valor, categoria: mv.categoria, descricao: mv.descricao || '' });
    setVagaCepStatus('idle');
    setTab('criar-vaga');
  }

  function cancelarVaga(id: string) {
    setMinhasVagas((prev) => prev.map((m) => m.id !== id ? m : { ...m, status: 'cancelada' }));
  }

  function aceitarCandidato(mvId: string, candId: string) {
    const mv = minhasVagas.find((m) => m.id === mvId);
    if (!mv || mv.status !== 'aberta') return; // cada vaga só pode ter um profissional aprovado
    setSelectedMvId(mvId); setSelectedCandId(candId); setTab('pagamento');
  }
  function recusarCandidato(mvId: string, candId: string) {
    setMinhasVagas((prev) => prev.map((m) => m.id !== mvId ? m : { ...m, candidatos: m.candidatos.map((c) => c.id === candId ? { ...c, status: 'recusado' } : c) }));
  }
  function confirmarPagamento() {
    if (!selectedMvId || !selectedCandId) return;
    setMinhasVagas((prev) => prev.map((m) => m.id !== selectedMvId ? m : {
      ...m, status: 'preenchida',
      candidatos: m.candidatos.map((c) => c.id === selectedCandId ? { ...c, status: 'aceito' } : (c.status === 'pendente' ? { ...c, status: 'recusado' } : c)),
    }));
    setPagamentos((prev) => [{ id: 'p' + Date.now(), mvId: selectedMvId, candId: selectedCandId, nome: minhasVagas.find(m => m.id === selectedMvId)?.candidatos.find(c => c.id === selectedCandId)?.nome || '', status: 'retido' }, ...prev]);
    setTab('painel');
  }
  function liberarPagamento(mvId: string) {
    setMinhasVagas((prev) => prev.map((m) => m.id !== mvId ? m : { ...m, status: 'concluida' }));
    setPagamentos((prev) => prev.map((p) => p.mvId !== mvId ? p : { ...p, status: 'liberado' }));
  }

  const selectedMv = minhasVagas.find((m) => m.id === selectedMvId) || null;

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
        {tab === 'home' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Vagas no feed</h1>
            <p className="text-sm text-gray-500 mb-6">Visão geral das vagas publicadas na plataforma</p>
            <div className="flex flex-col gap-4">
              {FEED_MOCK.map((v, i) => (
                <div
                  key={i}
                  onClick={() => setVagaSelecionada({ clinica: v.clinica, categoria: v.categoria, turno: v.turno, local: v.local, data: v.data, horario: v.horario, valor: v.valor, descricao: v.descricao })}
                  className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="text-xs font-bold text-primary uppercase">{v.categoria} · {v.turno}</div>
                      <div className="text-lg font-extrabold mt-1">{v.clinica}</div>
                    </div>
                    <div className="bg-green-100 text-green-700 font-extrabold text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">R$ {v.valor}</div>
                  </div>
                  <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                    <div>LOCAL {v.local}</div><div>DATA {v.data}</div><div>HORÁRIO {v.horario}</div>
                  </div>
                </div>
              ))}
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
              {enderecoCompleto && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  {enderecoCompleto} — <a href={mapsLink(enderecoCompleto)} target="_blank" className="font-bold">ver no Google Maps</a>
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
                <select value={vagaForm.categoria} onChange={(e) => setVagaForm((f) => ({ ...f, categoria: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm">
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
            <button disabled={publishDisabled} onClick={publicarVaga}
              className={`mt-6 w-full py-3.5 rounded-lg font-bold text-sm ${publishDisabled ? 'bg-gray-200 text-gray-400' : 'bg-primary hover:bg-primaryDark text-white'}`}>
              {editingId ? 'Salvar alterações' : 'Publicar vaga'}
            </button>
          </div>
        )}

        {tab === 'painel' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-extrabold mb-1">Painel da clínica</h1>
            <p className="text-sm text-gray-500 mb-6">Acompanhe suas vagas publicadas e candidatos</p>
            <div className="flex flex-col gap-4">
              {minhasVagas.map((mv) => {
                const badge = statusBadge(mv.status);
                const pend = mv.candidatos.filter((c) => c.status === 'pendente').length;
                const retido = pagamentos.find((p) => p.mvId === mv.id && p.status === 'retido');
                const hired = mv.candidatos.find((c) => c.status === 'aceito');
                return (
                  <div
                    key={mv.id}
                    onClick={() => setVagaSelecionada({ categoria: mv.categoria, local: mv.local, data: mv.data, horario: mv.horario, valor: mv.valor, descricao: mv.descricao })}
                    className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-xs font-bold text-primary uppercase">{mv.categoria}</div>
                        <div className="text-lg font-extrabold mt-1">{mv.local}</div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    <div className="flex gap-4 flex-wrap mt-3 text-sm text-gray-500">
                      <div>DATA {mv.data}</div><div>HORÁRIO {mv.horario}</div><div>R$ {mv.valor}</div>
                    </div>
                    {mv.descricao && <div className="text-sm text-gray-600 mt-3">{mv.descricao}</div>}
                    <div onClick={(e) => e.stopPropagation()} className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 flex-wrap gap-2">
                      <div className="text-sm text-gray-500">{mv.candidatos.length === 0 ? 'Nenhum candidato ainda' : `${mv.candidatos.length} candidato(s) · ${pend} pendente(s)`}</div>
                      <div className="flex gap-2 flex-wrap">
                        {mv.status === 'aberta' && (
                          <>
                            <button onClick={() => editarVaga(mv)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Editar</button>
                            <button onClick={() => cancelarVaga(mv.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold text-danger">Cancelar</button>
                          </>
                        )}
                        {mv.status === 'preenchida' && retido && (
                          <button onClick={() => liberarPagamento(mv.id)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold">Confirmar presença e liberar pagamento</button>
                        )}
                        <button onClick={() => { setSelectedMvId(mv.id); setTab('candidatos'); }} className="px-4 py-2 rounded-lg bg-secondary text-white text-sm font-bold">Ver candidatos</button>
                      </div>
                    </div>
                    {mv.status === 'concluida' && hired && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AvaliarProfissional candId={hired.id} nome={hired.nome} avaliacoes={avaliacoesProfissional} setAvaliacoes={setAvaliacoesProfissional} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'candidatos' && selectedMv && (
          <div className="max-w-2xl mx-auto p-8">
            <button onClick={() => setTab('painel')} className="text-sm font-bold text-gray-500 mb-4">← Voltar ao painel</button>
            <h1 className="text-xl font-extrabold mb-1">Candidatos — {selectedMv.categoria}</h1>
            <p className="text-sm text-gray-500 mb-6">{selectedMv.local} · {selectedMv.data}</p>
            {selectedMv.status !== 'aberta' && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">
                {selectedMv.status === 'cancelada'
                  ? 'Esta vaga foi cancelada.'
                  : 'Esta vaga já tem um profissional aprovado — cada vaga permite apenas um aprovado por enquanto.'}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {selectedMv.candidatos.map((c) => {
                const badge = statusBadge(c.status);
                return (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-extrabold">{c.nome}</div>
                        <div className="text-sm text-gray-500">{c.funcao} · {c.area}</div>
                        <div className="text-xs text-gray-500 mt-1">Região: {c.regioes}</div>
                      </div>
                      <div className={badge.className}>{badge.label}</div>
                    </div>
                    {c.status === 'pendente' && selectedMv.status === 'aberta' && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => recusarCandidato(selectedMv.id, c.id)} className="px-3.5 py-2 rounded-lg border border-gray-300 text-sm font-bold">Recusar</button>
                        <button onClick={() => aceitarCandidato(selectedMv.id, c.id)} className="px-3.5 py-2 rounded-lg bg-primary text-white text-sm font-bold">Aceitar e pagar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'pagamento' && selectedMv && (() => {
          const cand = selectedMv.candidatos.find((c) => c.id === selectedCandId);
          const bruto = parseFloat(selectedMv.valor) || 0;
          const taxa = bruto * TAXA_PLATAFORMA;
          return (
            <div className="max-w-lg mx-auto p-8">
              <div className="text-sm font-bold text-primary mb-1">Pagamento</div>
              <h1 className="text-2xl font-extrabold mb-6">Confirmar contratação</h1>
              <div className="bg-white border border-gray-200 rounded-2xl p-7">
                <div className="text-sm text-gray-500">Profissional</div>
                <div className="text-lg font-extrabold">{cand?.nome}</div>
                <div className="text-sm text-gray-500">{selectedMv.categoria} · {selectedMv.local}</div>
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
                <input value={clinica.nome} onChange={(e) => setClinica((f) => ({ ...f, nome: e.target.value }))} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">CNPJ</span>
                <input maxLength={18} value={clinica.cnpj} onChange={(e) => setClinica((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm" />
              </label>
              <div className="text-sm text-gray-500">Endereço cadastrado: {buildEndereco(clinica) || '—'}</div>
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

function AvaliarProfissional({ candId, nome, avaliacoes, setAvaliacoes }: {
  candId: string; nome: string; avaliacoes: Record<string, Avaliacao>; setAvaliacoes: (fn: any) => void;
}) {
  const done = avaliacoes[candId];
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  if (done) {
    return <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">Você avaliou {nome}: nota {done.nota}/5 — "{done.comentario}"</div>;
  }
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="text-xs font-bold mb-2">Avaliar {nome}</div>
      <select value={nota} onChange={(e) => setNota(Number(e.target.value))} className="px-2.5 py-1.5 rounded-md border border-gray-300 text-sm mb-2">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} — {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][n]}</option>)}
      </select>
      <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentário (opcional)" rows={2} className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm mb-2" />
      <button onClick={() => setAvaliacoes((prev: any) => ({ ...prev, [candId]: { nota, comentario } }))} className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-bold">Enviar avaliação</button>
    </div>
  );
}
