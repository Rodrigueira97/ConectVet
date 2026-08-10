import { PublicHeader } from '@/app/components/PublicHeader';
import { PublicFooter } from '@/app/components/PublicFooter';

// Rascunho inicial — reflete o que a plataforma coleta hoje (cadastro de
// clínica/profissional, vagas, candidaturas, avaliações), pensado em linha
// com a LGPD. Não é aconselhamento jurídico: antes de tratar isso como
// política definitiva, vale revisão de um advogado, principalmente as
// seções 7 e 8 (direitos do titular e retenção de dados).
export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-paws">
      <PublicHeader />
      <div className="max-w-[760px] mx-auto p-5 sm:p-8">
        <div className="bg-white rounded-[20px] shadow-sm p-6 sm:p-9">
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink mb-1">Termos de Política de Privacidade</h1>
          <div className="text-xs font-bold text-gray-400 mb-6">Última atualização: agosto de 2026</div>

          <p className="text-sm leading-relaxed text-gray-700 mb-5">
            O ConectVet conecta clínicas veterinárias e profissionais da área pra cobrir plantões. Esta política
            explica quais dados coletamos, por que coletamos, e quais direitos você tem sobre eles — em linha com a
            Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
          </p>

          <Secao titulo="1. Quem é responsável pelos seus dados">
            <p>
              O ConectVet é o controlador dos dados pessoais tratados na plataforma. Dúvidas ou solicitações podem
              ser enviadas para <Email />.
            </p>
          </Secao>

          <Secao titulo="2. Quais dados coletamos">
            <p className="font-bold text-ink">Se você é profissional:</p>
            <ul className="list-disc pl-5 mt-1.5 mb-3">
              <li>Nome, e-mail, telefone, CPF e foto de perfil;</li>
              <li>Categoria profissional e, quando aplicável, número de registro (CRMV) e área de atuação;</li>
              <li>Candidaturas enviadas, plantões realizados e avaliações recebidas.</li>
            </ul>
            <p className="font-bold text-ink">Se você é clínica:</p>
            <ul className="list-disc pl-5 mt-1.5 mb-3">
              <li>Razão social, CNPJ, inscrição estadual e dados do responsável técnico;</li>
              <li>Endereço, telefone e fotos da estrutura;</li>
              <li>Vagas publicadas, pagamentos e avaliações feitas e recebidas.</li>
            </ul>
            <p>
              <b className="text-ink">De qualquer visitante:</b> dados de navegação básicos (como cookies técnicos)
              pra o site funcionar corretamente — ver seção 5.
            </p>
          </Secao>

          <Secao titulo="3. Para que usamos esses dados">
            <ul className="list-disc pl-5">
              <li>Viabilizar o cadastro e a autenticação na plataforma;</li>
              <li>Conectar clínicas e profissionais para preenchimento de plantões;</li>
              <li>Processar candidaturas, confirmações de presença e pagamentos;</li>
              <li>Exibir avaliações e reputação entre as partes;</li>
              <li>Enviar comunicações relacionadas ao uso da plataforma (nunca marketing de terceiros).</li>
            </ul>
          </Secao>

          <Secao titulo="4. Com quem compartilhamos">
            <p>
              Ao se candidatar a uma vaga, seu nome, categoria, avaliações e (se aplicável) CRMV ficam visíveis pra
              clínica responsável — é o necessário pra ela decidir sobre a contratação do plantão. Clínicas exibem
              nome, endereço e fotos publicamente pra profissionais avaliarem a vaga.{' '}
              <b className="text-ink">Não vendemos nem alugamos dados pessoais a terceiros</b> para fins de marketing.
            </p>
          </Secao>

          <Secao titulo="5. Cookies">
            <p>
              Usamos cookies essenciais pra manter sua sessão ativa (login) e lembrar preferências básicas de busca.
              Não usamos cookies de rastreamento publicitário de terceiros.
            </p>
          </Secao>

          <Secao titulo="6. Segurança">
            <p>
              Adotamos medidas técnicas razoáveis pra proteger seus dados contra acesso não autorizado, perda ou
              alteração indevida. Nenhum sistema é 100% infalível, e trabalhamos continuamente pra melhorar essa
              proteção.
            </p>
          </Secao>

          <Secao titulo="7. Seus direitos">
            <p>Como titular dos dados, você pode a qualquer momento solicitar:</p>
            <ul className="list-disc pl-5 mt-1.5 mb-3">
              <li>Confirmação de que tratamos seus dados, e acesso a eles;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Exclusão de dados desnecessários ou tratados fora do previsto nesta política;</li>
              <li>Portabilidade dos dados a outro fornecedor, mediante requisição expressa;</li>
              <li>Revogação do consentimento, quando aplicável.</li>
            </ul>
            <p>Pra exercer qualquer um desses direitos, escreva pra <Email />.</p>
          </Secao>

          <Secao titulo="8. Por quanto tempo guardamos os dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa, ou pelo tempo necessário pra cumprir obrigações
              legais (fiscais, por exemplo). Ao solicitar exclusão de conta, removemos ou anonimizamos os dados que
              não precisarmos reter por obrigação legal.
            </p>
          </Secao>

          <Secao titulo="9. Alterações nesta política">
            <p>
              Podemos atualizar esta política conforme a plataforma evolui. Mudanças relevantes serão comunicadas
              por e-mail ou aviso na própria plataforma.
            </p>
          </Secao>

          <Secao titulo="10. Fale com a gente">
            <p>Dúvidas sobre esta política ou sobre seus dados: <Email />.</p>
          </Secao>

          <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs font-semibold leading-relaxed rounded-xl px-4 py-3.5 mt-7">
            ⚠️ Rascunho inicial — reflete o que a plataforma coleta hoje, mas não substitui revisão jurídica antes de
            valer como política oficial, principalmente nos itens 7 e 8 (direitos do titular e retenção de dados).
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-extrabold text-ink mb-2">{titulo}</h2>
      <div className="text-sm leading-relaxed text-gray-700 [&_ul]:text-sm [&_ul]:leading-relaxed [&_ul]:text-gray-700 [&_li]:mb-1">
        {children}
      </div>
    </div>
  );
}

function Email() {
  return <a href="mailto:conectvet.vagas@gmail.com" className="font-bold text-primaryDeep">conectvet.vagas@gmail.com</a>;
}
