import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterClinicaDto } from './dto/register-clinica.dto';
import { RegisterProfissionalDto } from './dto/register-profissional.dto';
import { LoginDto } from './dto/login.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { ConfirmarEmailDto } from './dto/confirmar-email.dto';
import { ReenviarConfirmacaoDto } from './dto/reenviar-confirmacao.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/clinica')
  registrarClinica(@Body() dto: RegisterClinicaDto) {
    return this.authService.registrarClinica(dto);
  }

  @Post('register/profissional')
  registrarProfissional(@Body() dto: RegisterProfissionalDto) {
    return this.authService.registrarProfissional(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('confirmar-email')
  confirmarEmail(@Body() dto: ConfirmarEmailDto) {
    return this.authService.confirmarEmail(dto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reenviar-confirmacao')
  reenviarConfirmacao(@Body() dto: ReenviarConfirmacaoDto) {
    return this.authService.reenviarConfirmacao(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('senha')
  alterarSenha(@CurrentUser() user: AuthUser, @Body() dto: AlterarSenhaDto) {
    return this.authService.alterarSenha(user.userId, dto);
  }
}
