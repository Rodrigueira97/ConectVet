import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterClinicaDto } from './dto/register-clinica.dto';
import { RegisterProfissionalDto } from './dto/register-profissional.dto';
import { LoginDto } from './dto/login.dto';
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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }
}
