import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';

export interface UploadTarget {
  fileId: string;
  uploadUrl: string | null;
  objectKey: string;
  expiresInSec: number;
}

export type Bucket = 'media' | 'private';

/**
 * Object storage (handoff, раздел 9): клиент грузит файл напрямую по одноразовому PUT-URL,
 * в БД хранится id файла, чтение — короткоживущими подписанными GET-URL.
 * В dev — MinIO из docker-compose; в prod — любой S3-совместимый сервис.
 */
@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      credentials: { accessKeyId: config.get('S3_ACCESS_KEY'), secretAccessKey: config.get('S3_SECRET_KEY') },
      forcePathStyle: true, // MinIO
    });
  }

  bucketName(bucket: Bucket) {
    return bucket === 'media' ? this.config.get('S3_BUCKET_MEDIA') : this.config.get('S3_BUCKET_PRIVATE');
  }

  async createUploadUrl(opts: { fileId: string; bucket: Bucket; mimeType: string; sizeBytes: number }): Promise<UploadTarget> {
    const objectKey = `${opts.bucket}/${opts.fileId}`;
    const expiresInSec = 600;
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucketName(opts.bucket), Key: objectKey, ContentType: opts.mimeType }),
      { expiresIn: expiresInSec },
    );
    return { fileId: opts.fileId, uploadUrl, objectKey, expiresInSec };
  }

  async createReadUrl(objectKey: string, bucket: Bucket, ttlSec = 300): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: objectKey }), { expiresIn: ttlSec });
  }

  /** Подтверждение загрузки: объект существует и размер совпадает с заявленным. */
  async verifyUploaded(objectKey: string, bucket: Bucket, expectedSize?: number): Promise<{ ok: boolean; size: number }> {
    try {
      const head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucketName(bucket), Key: objectKey }));
      const size = head.ContentLength ?? 0;
      return { ok: expectedSize === undefined || expectedSize === 0 || size === expectedSize, size };
    } catch {
      return { ok: false, size: 0 };
    }
  }
}
