import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/enums';
import { RegisterClinicaDto } from './dto/register-clinica.dto';
import { RegisterProfissionalDto } from './dto/register-profissional.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async assertEmailDisponivel(email: string) {
    const existente = await this.prisma.user.findUnique({ where: { email } });
    if (existente)
      throw new ConflictException('Este e-mail já está cadastrado.');
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

  async registrarClinica(dto: RegisterClinicaDto) {
    await this.assertEmailDisponivel(dto.email);

    const cnpjEmUso = await this.prisma.clinica.findUnique({
      where: { cnpj: dto.cnpj },
    });
    if (cnpjEmUso) throw new ConflictException('Este CNPJ já está cadastrado.');

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
            responsavelTecnico: dto.responsavelTecnico,
            cep: dto.cep,
            estado: dto.estado,
            cidade: dto.cidade,
            bairro: dto.bairro,
            rua: dto.rua,
            numero: dto.numero,
            complemento: dto.complemento,
            alvaraUrl: dto.alvaraUrl,
            fotosEstrutura: dto.fotosEstrutura,
            planosSaude: dto.planosSaude,
            sistemas: dto.sistemas,
            observacoes: dto.observacoes,
          },
        },
      },
    });

    return this.emitirToken(user);
  }

  async registrarProfissional(dto: RegisterProfissionalDto) {
    await this.assertEmailDisponivel(dto.email);

    const documentoEmUso = await this.prisma.profissional.findUnique({
      where: { documento: dto.documento },
    });
    if (documentoEmUso)
      throw new ConflictException('Este CPF/CNPJ já está cadastrado.');

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
            tipoComprovacao: dto.tipoComprovacao,
            comprovanteUrl: dto.comprovanteUrl,
            idDocUrls: dto.idDocUrls,
            curriculoUrl: dto.curriculoUrl,
            areaAtuacao: dto.areaAtuacao,
            planoSaude: dto.planoSaude,
            regioesAtendimento: dto.regioesAtendimento,
            observacoes: dto.observacoes,
          },
        },
      },
    });

    return this.emitirToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('E-mail ou senha inválidos.');

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida)
      throw new UnauthorizedException('E-mail ou senha inválidos.');

    return this.emitirToken(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clinica: true, profissional: true },
    });
    if (!user) throw new UnauthorizedException();
    const { senhaHash, ...safeUser } = user;
    void senhaHash;
    return safeUser;
  }
}
