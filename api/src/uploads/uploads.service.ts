import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class UploadsService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    this.bucket = config.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = (config.get<string>('R2_PUBLIC_URL') || '').replace(/\/+$/, '');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // R2 não tem certificado TLS pra endereçamento virtual-hosted (<bucket>.<account>.r2.cloudflarestorage.com);
      // sem isso o handshake TLS quebra. Também desliga os checksums "flexíveis" que o SDK manda
      // por padrão nas versões recentes e que o R2 não suporta do mesmo jeito que o S3 de verdade.
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
  }

  async upload(file: Express.Multer.File): Promise<string> {
    const key = `${randomUUID()}${extname(file.originalname)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }
}
