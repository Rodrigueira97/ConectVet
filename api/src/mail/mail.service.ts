import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

function templateConfirmacaoEmail(nome: string, link: string): string {
  return `
  <div style="background:#f4f8f8;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px 28px;">
      <div style="font-size:19px;font-weight:800;margin-bottom:22px;">
        <span style="color:#042d4c;">conect</span> <span style="color:#003531;">vet</span>
      </div>
      <h1 style="font-size:19px;font-weight:800;color:#0d2a2f;margin:0 0 16px;">Confirme seu e-mail</h1>
      <p style="font-size:13.5px;line-height:1.65;color:#445a5f;margin:0 0 4px;">Olá, ${nome},</p>
      <p style="font-size:13.5px;line-height:1.65;color:#445a5f;margin:0 0 20px;">
        Falta pouco! Clique no botão abaixo para confirmar seu e-mail e ativar sua conta na ConectVet.
      </p>
      <div style="text-align:center;margin-bottom:18px;">
        <a href="${link}" style="background:#00a19a;color:#ffffff;font-weight:700;font-size:14px;padding:13px 34px;border-radius:10px;text-decoration:none;display:inline-block;">
          Confirmar e-mail
        </a>
      </div>
      <div style="font-size:11.5px;color:#2e8cad;font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all;background:#f4f8f8;border-radius:8px;padding:10px 12px;margin-bottom:14px;">
        ${link}
      </div>
      <p style="font-size:11.5px;color:#9fb0b3;line-height:1.6;margin:0;">
        Este link expira em 24 horas. Se você não criou uma conta na ConectVet, pode ignorar este e-mail.
      </p>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eef2f2;font-size:11px;color:#a9bcbf;text-align:center;">
        ConectVet · Conectando clínicas e profissionais veterinários
      </div>
    </div>
  </div>`;
}

// Alternativa em texto puro (multipart/alternative) — e-mails só em HTML são
// um dos sinais que filtros de spam levam em conta.
function templateConfirmacaoEmailTexto(nome: string, link: string): string {
  return [
    `Olá, ${nome},`,
    '',
    'Falta pouco! Acesse o link abaixo para confirmar seu e-mail e ativar sua conta na ConectVet:',
    '',
    link,
    '',
    'Este link expira em 24 horas. Se você não criou uma conta na ConectVet, pode ignorar este e-mail.',
    '',
    'ConectVet · Conectando clínicas e profissionais veterinários',
  ].join('\n');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly remetente: string;

  constructor(config: ConfigService) {
    const usuario = config.get<string>('GMAIL_USER') || '';
    const senhaApp = config.get<string>('GMAIL_APP_PASSWORD') || '';
    this.remetente = config.get<string>('MAIL_FROM') || (usuario ? `ConectVet <${usuario}>` : '');
    this.transporter = usuario && senhaApp
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user: usuario, pass: senhaApp },
          // Se o servidor não conseguir alcançar o Gmail (comum em alguns
          // hosts que restringem SMTP de saída), falha rápido em vez de
          // ficar pendurado por minutos.
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 10_000,
        })
      : null;
  }

  get configurado(): boolean {
    return !!this.transporter;
  }

  async enviarConfirmacaoEmail(to: string, nome: string, link: string) {
    if (!this.transporter) {
      // Sem GMAIL_USER/GMAIL_APP_PASSWORD (comum em dev local): imprime o link
      // no log em vez de falhar o cadastro, pra dar pra testar o fluxo sem
      // configurar e-mail.
      this.logger.warn(
        `GMAIL_USER/GMAIL_APP_PASSWORD não configurados — link de confirmação para ${to}: ${link}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.remetente,
        to,
        subject: 'Confirme seu e-mail para ativar sua conta',
        text: templateConfirmacaoEmailTexto(nome, link),
        html: templateConfirmacaoEmail(nome, link),
      });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail de confirmação pra ${to}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
