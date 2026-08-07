import { useEffect, useState } from 'react';
import { Clinica, Profissional, getClinicaMe, getProfissionalMe, getRole, getToken } from '@/lib/api';

// Quando o próprio profissional/clínica logado abre uma página pública do
// app (ex.: perfil de outra clínica, detalhes de uma vaga), mantém a
// sidebar do app em vez de trocar pra o cabeçalho público — visualmente
// ele nunca "sai" do painel dele.
//
// `logged` sai do localStorage (síncrono) assim que o componente monta —
// dá pra saber se mostra a sidebar no skeleton sem esperar o perfil
// carregar. `conta` só fica pronta depois do fetch, com nome/foto pro
// rodapé da sidebar de verdade.
export function useContaLogada() {
  const [logged, setLogged] = useState<boolean | undefined>(undefined);
  const [conta, setConta] = useState<
    { role: 'PROFISSIONAL'; perfil: Profissional } | { role: 'CLINICA'; perfil: Clinica } | null
  >(null);

  useEffect(() => {
    let cancelado = false;
    const token = getToken();
    setLogged(!!token);
    if (!token) return;
    const role = getRole();
    const promessa = role === 'CLINICA' ? getClinicaMe() : getProfissionalMe();
    promessa
      .then((perfil) => {
        if (cancelado) return;
        setConta(role === 'CLINICA' ? { role: 'CLINICA', perfil: perfil as Clinica } : { role: 'PROFISSIONAL', perfil: perfil as Profissional });
      })
      .catch(() => { if (!cancelado) setLogged(false); });
    return () => { cancelado = true; };
  }, []);

  return { logged, conta };
}
