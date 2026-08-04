import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Cloud API oficial da Meta — não precisa de SDK, é só um POST autenticado.
// https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
const GRAPH_API_VERSION = 'v21.0';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
  }

  get configurado(): boolean {
    return !!this.token && !!this.phoneNumberId;
  }

  // Números são salvos hoje só como DDD + número (ver onlyDigits no front) —
  // aqui garantimos o formato internacional que a API exige, assumindo Brasil.
  private formatarNumero(telefone: string): string | null {
    const digitos = telefone.replace(/\D/g, '');
    if (digitos.length < 10) return null;
    return digitos.startsWith('55') ? digitos : `55${digitos}`;
  }

  /**
   * Envia um template já aprovado pela Meta. É obrigatório usar template
   * (não texto livre) pra mensagens que a gente inicia — não é resposta a algo
   * que o usuário mandou — fora da janela de 24h de conversa.
   */
  async enviarTemplate(telefone: string | null | undefined, templateName: string, variaveis: string[] = []) {
    if (!this.configurado) {
      this.logger.debug('WhatsApp não configurado (faltam variáveis de ambiente) — envio pulado.');
      return;
    }
    if (!telefone) return;
    const to = this.formatarNumero(telefone);
    if (!to) return;

    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'pt_BR' },
              ...(variaveis.length
                ? { components: [{ type: 'body', parameters: variaveis.map((texto) => ({ type: 'text', text: texto })) }] }
                : {}),
            },
          }),
        },
      );

      if (!res.ok) {
        const corpo = await res.text();
        this.logger.error(`Falha ao enviar WhatsApp pra ${to}: ${res.status} ${corpo}`);
      }
    } catch (err) {
      this.logger.error(`Erro ao chamar a API do WhatsApp: ${err instanceof Error ? err.message : err}`);
    }
  }
}
