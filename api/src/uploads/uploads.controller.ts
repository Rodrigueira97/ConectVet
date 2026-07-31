import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Sem guard de auth de propósito: o cadastro de clínica/profissional precisa
// enviar documentos (alvará, CRMV, etc.) antes de existir uma conta/token.
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_SIZE } }))
  async uploadUm(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return { url: await this.uploadsService.upload(file) };
  }

  @Post('multiplos')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage(), limits: { fileSize: MAX_SIZE } }))
  async uploadVarios(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado.');
    const urls = await Promise.all(files.map((file) => this.uploadsService.upload(file)));
    return { urls };
  }
}
