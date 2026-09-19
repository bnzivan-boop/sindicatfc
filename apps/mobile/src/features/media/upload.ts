import * as Crypto from 'expo-crypto';
import { api } from '../../api/client';

export interface PickedImage { uri: string; mimeType: string }

type Mime = 'image/jpeg' | 'image/png' | 'image/heic';

/** Читает файл по uri (file:// на устройстве, blob:/data: на web) и считает sha256 — идемпотентность загрузки (handoff §13). */
export async function readImage(img: PickedImage): Promise<{ bytes: ArrayBuffer; sizeBytes: number; checksumSha256: string; mimeType: Mime }> {
  const bytes = await (await fetch(img.uri)).arrayBuffer();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  const checksumSha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const mimeType = (['image/jpeg', 'image/png', 'image/heic'].includes(img.mimeType) ? img.mimeType : 'image/jpeg') as Mime;
  return { bytes, sizeBytes: bytes.byteLength, checksumSha256, mimeType };
}

/**
 * Загрузка по схеме handoff §9: upload-url от API → PUT напрямую в хранилище.
 * `uploadUrl === null` означает, что такой файл (по checksum) уже загружен — дубль не шлём.
 */
export async function uploadTo(urlPath: string, img: PickedImage): Promise<{ fileId: string }> {
  const file = await readImage(img);
  const target = await api<{ fileId: string; uploadUrl: string | null }>(urlPath, { method: 'POST', body: { mimeType: file.mimeType, sizeBytes: file.sizeBytes, checksumSha256: file.checksumSha256 } });
  if (target.uploadUrl) {
    const res = await fetch(target.uploadUrl, { method: 'PUT', headers: { 'content-type': file.mimeType }, body: file.bytes });
    if (!res.ok) throw new Error(`Хранилище ответило ${res.status}`);
  }
  return { fileId: target.fileId };
}
