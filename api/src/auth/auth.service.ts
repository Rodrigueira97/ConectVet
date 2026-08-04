import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../../generated/prisma/enums';
import { RegisterClinicaDto } from './dto/register-clinica.dto';
import { RegisterProfissionalDto } from './dto/register-profissional.dto';
import { LoginDto } from './dto/login.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { Prisma } from '../../generated/prisma/client';

const CONFIRMACAO_VALIDADE_MS = 24 * 60 * 60 * 1000;
const REENVIO_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class AuthService {
  private readonly frontendUrl: string;
  // Desliga a exigência de confirmação de e-mail sem remover o fluxo (rotas,
  // páginas, envio) — só liga de novo mudando essa variável de ambiente.
  // Hoje está desligada porque o Render free tier bloqueia SMTP de saída
  // (ver MailService), então ninguém confirmado conseguiria se cadastrar.
  private readonly confirmacaoHabilitada: boolean;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
    this.confirmacaoHabilitada = config.get<string>('EMAIL_CONFIRMATION_ENABLED') !== 'false';
  }

  // Cadastro nunca confirmado (emailVerificado = false) não bloqueia uma nova
  // tentativa — a conta abandonada é apagada pra liberar o e-mail/CNPJ/CPF.
  // Só bloqueia de fato quando alguém já confirmou o e-mail daquela conta.
  private async liberarEmailPendente(email: string) {
    const existente = await this.prisma.user.findUnique({ where: { email } });
    if (!existente) return;
    if (existente.emailVerificado) throw new ConflictException('Este e-mail já está cadastrado.');
    await this.prisma.user.delete({ where: { id: existente.id } });
  }

  private async liberarCnpjPendente(cnpj: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { cnpj }, include: { user: true } });
    if (!clinica) return;
    if (clinica.user.emailVerificado) throw new ConflictException('Este CNPJ já está cadastrado.');
    await this.prisma.user.delete({ where: { id: clinica.userId } });
  }

  private async liberarDocumentoPendente(documento: string) {
    const profissional = await this.prisma.profissional.findUnique({ where: { documento }, include: { user: true } });
    if (!profissional) return;
    if (profissional.user.emailVerificado) throw new ConflictException('Este CPF/CNPJ já está cadastrado.');
    await this.prisma.user.delete({ where: { id: profissional.userId } });
  }

  private emitirToken(user: { id: string; email: string; role: string }) {
    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      role: user.role,
    };
  }

  private async enviarConfirmacao(user: { id: string; email: string }, nome: string) {
    const token = randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + CONFIRMACAO_VALIDADE_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificacaoToken: token, emailVerificacaoExpira: expira },
    });
    const link = `${this.frontendUrl}/confirmar-email?token=${token}`;
    // Não é "await" de propósito: o SMTP do Gmail pode demorar (ou travar) a
    // partir do servidor de produção, e isso não pode prender a resposta do
    // cadastro. O envio roda em segundo plano; erro só vai pro log.
    void this.mail.enviarConfirmacaoEmail(user.email, nome, link);
  }

  async registrarClinica(dto: RegisterClinicaDto) {
    await this.liberarEmailPendente(dto.email);
    await this.liberarCnpjPendente(dto.cnpj);

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        senhaHash,
        role: Role.CLINICA,
        clinica: {
          create: {
            nome: dto.nome,
            cnpj: dto.cnpj,
            inscricaoEstadual: dto.inscricaoEstadual,
            responsavelTecnicoNome: dto.responsavelTecnicoNome,
            responsavelTecnicoCrmv: dto.responsavelTecnicoCrmv,
            telefone: dto.telefone,
            cep: dto.cep,
            estado: dto.estado,
            cidade: dto.cidade,
            bairro: dto.bairro,
            rua: dto.rua,
            numero: dto.numero,
            complemento: dto.complemento,
            alvaraUrl: dto.alvaraUrl,
            fotosEstrutura: (dto.fotosEstrutura ?? []) as unknown as Prisma.InputJsonValue,
            logoUrl: dto.logoUrl,
            planosSaude: dto.planosSaude,
            sistemas: dto.sistemas,
            observacoes: dto.observacoes,
          },
        },
      },
    });

    if (!this.confirmacaoHabilitada) {
      await this.prisma.user.update({ where: { id: user.id }, data: { emailVerificado: true } });
      return this.emitirToken(user);
    }

    await this.enviarConfirmacao(user, dto.nome);
    return { email: user.email };
  }

  async registrarProfissional(dto: RegisterProfissionalDto) {
    await this.liberarEmailPendente(dto.email);
    await this.liberarDocumentoPendente(dto.documento);

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        senhaHash,
        role: Role.PROFISSIONAL,
        profissional: {
          create: {
            nome: dto.nome,
            documento: dto.documento,
            funcao: dto.funcao,
            especialidade: dto.especialidade,
            telefone: dto.telefone,
            dataNascimento: new Date(dto.dataNascimento),
            tipoComprovacao: dto.tipoComprovacao,
            comprovanteUrl: dto.comprovanteUrl,
            idDocUrls: dto.idDocUrls,
            curriculoUrl: dto.curriculoUrl,
            fotoUrl: dto.fotoUrl,
            areaAtuacao: dto.areaAtuacao,
            regioesAtendimento: dto.regioesAtendimento,
            observacoes: dto.observacoes,
          },
        },
      },
    });

    if (!this.confirmacaoHabilitada) {
      await this.prisma.user.update({ where: { id: user.id }, data: { emailVerificado: true } });
      return this.emitirToken(user);
    }

    await this.enviarConfirmacao(user, dto.nome);
    return { email: user.email };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('E-mail ou senha inválidos.');

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida)
      throw new UnauthorizedException('E-mail ou senha inválidos.');

    if (this.confirmacaoHabilitada && !user.emailVerificado) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NAO_CONFIRMADO',
        message: 'Confirme seu e-mail antes de entrar.',
      });
    }

    return this.emitirToken(user);
  }

  async confirmarEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificacaoToken: token },
    });
    if (!user) throw new BadRequestException('Link de confirmação inválido.');
    if (user.emailVerificacaoExpira && user.emailVerificacaoExpira < new Date()) {
      throw new BadRequestException('Link de confirmação expirado. Solicite um novo e-mail.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificado: true, emailVerificacaoToken: null, emailVerificacaoExpira: null },
    });
    return { ok: true, email: user.email };
  }

  async reenviarConfirmacao(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { clinica: true, profissional: true },
    });
    // Resposta genérica pra não vazar se o e-mail existe ou já foi confirmado.
    if (!user || user.emailVerificado) return { ok: true };

    const tokenCriadoEm = user.emailVerificacaoExpira
      ? user.emailVerificacaoExpira.getTime() - CONFIRMACAO_VALIDADE_MS
      : 0;
    if (Date.now() - tokenCriadoEm < REENVIO_COOLDOWN_MS) {
      throw new BadRequestException('Aguarde um minuto antes de reenviar o e-mail.');
    }

    const nome = user.clinica?.nome ?? user.profissional?.nome ?? 'usuário';
    await this.enviarConfirmacao(user, nome);
    return { ok: true };
  }

  async alterarSenha(userId: string, dto: AlterarSenhaDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const senhaValida = await bcrypt.compare(dto.senhaAtual, user.senhaHash);
    if (!senhaValida) throw new BadRequestException('Senha atual incorreta.');

    const senhaHash = await bcrypt.hash(dto.novaSenha, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { senhaHash } });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clinica: true, profissional: true },
    });
    if (!user) throw new UnauthorizedException();
    const { senhaHash, emailVerificacaoToken, ...safeUser } = user;
    void senhaHash;
    void emailVerificacaoToken;
    return safeUser;
  }
}
