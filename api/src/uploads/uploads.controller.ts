import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function buildUrl(req: Request, filename: string) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

// Sem guard de auth de propósito: o cadastro de clínica/profissional precisa
// enviar documentos (alvará, CRMV, etc.) antes de existir uma conta/token.
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: MAX_SIZE } }))
  uploadUm(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return { url: buildUrl(req, file.filename) };
  }

  @Post('multiplos')
  @UseInterceptors(FilesInterceptor('files', 10, { storage, limits: { fileSize: MAX_SIZE } }))
  uploadVarios(@UploadedFiles() files: Express.Multer.File[], @Req() req: Request) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado.');
    return { urls: files.map((file) => buildUrl(req, file.filename)) };
  }
}
