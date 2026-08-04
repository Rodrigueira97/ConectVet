// Cria (e envia pra aprovação da Meta) o template genérico usado por
// NotificacoesService pra mandar toda notificação também via WhatsApp.
// Só precisa rodar uma vez — depois de aprovado, o template fica disponível
// pra sempre pela API de mensagens.
//
// Precisa de WHATSAPP_ACCESS_TOKEN (mesmo do .env) e WHATSAPP_BUSINESS_ACCOUNT_ID
// (o "ID da conta comercial do WhatsApp" — não é o mesmo que WHATSAPP_PHONE_NUMBER_ID;
// aparece em developers.facebook.com > seu app > WhatsApp > Configuração da API).
//
// Uso: WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxx npm run whatsapp:template   (dentro de api/)
import 'dotenv/config';

const GRAPH_API_VERSION = 'v21.0';

async function main() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !wabaId) {
    console.error(
      'Faltam variáveis: WHATSAPP_ACCESS_TOKEN (no .env) e WHATSAPP_BUSINESS_ACCOUNT_ID (passe na hora de rodar).',
    );
    process.exitCode = 1;
    return;
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'notificacao_generica',
        language: 'pt_BR',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Você tem uma novidade no ConectVet: {{1}}',
            example: { body_text: [['Sua candidatura para VetLife Ipanema foi aceita.']] },
          },
        ],
      }),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    console.error('Falha ao criar o template:', data);
    process.exitCode = 1;
    return;
  }

  console.log('Template enviado pra revisão da Meta:', data);
  console.log('Normalmente leva de alguns minutos a 24h pra aprovar. Acompanhe em:');
  console.log('developers.facebook.com > seu app > WhatsApp > Gerenciador de modelos de mensagem.');
}

main();
