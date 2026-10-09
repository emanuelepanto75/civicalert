import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import { config } from './config';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm' };

export class MediaError extends Error {}

function toDecimal([d, m, s], ref) {
  const value = d + m / 60 + s / 3600;
  return ref === 'S' || ref === 'W' ? -value : value;
}

// Dati EXIF utili al controllo di autenticità (spesso assenti: molti telefoni
// li rimuovono quando la foto viene caricata dal browser).
function readExif(exifBuffer) {
  try {
    const exif = exifReader(exifBuffer);
    const gps = exif.GPSInfo;
    return {
      takenAt: exif.Photo?.DateTimeOriginal || null,
      lat: gps?.GPSLatitude ? toDecimal(gps.GPSLatitude, gps.GPSLatitudeRef) : null,
      lon: gps?.GPSLongitude ? toDecimal(gps.GPSLongitude, gps.GPSLongitudeRef) : null,
    };
  } catch {
    return {};
  }
}

/**
 * Salva il file caricato in UPLOAD_DIR/anno/mese/. Le foto vengono ruotate,
 * ridimensionate e ricodificate in JPEG senza metadati (privacy).
 */
export async function saveMedia(file) {
  if (!file || typeof file === 'string' || file.size === 0) throw new MediaError('Aggiungi una foto o un video');
  if (file.size > config.maxUploadMb * 1024 * 1024) {
    throw new MediaError(`Il file supera ${config.maxUploadMb} MB`);
  }

  const now = new Date();
  const dir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  await fs.mkdir(path.join(config.uploadDir, dir), { recursive: true });
  const id = `${now.getTime()}-${crypto.randomBytes(6).toString('hex')}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (IMAGE_TYPES.includes(file.type)) {
    let image, meta;
    try {
      image = sharp(buffer, { failOn: 'error' });
      meta = await image.metadata();
    } catch {
      throw new MediaError('Immagine non leggibile. Prova con una foto JPG o PNG.');
    }
    const exif = meta.exif ? readExif(meta.exif) : {};
    const relPath = path.join(dir, `${id}.jpg`);
    await image
      .rotate()
      .resize({ width: config.maxImageSidePx, height: config.maxImageSidePx, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(config.uploadDir, relPath));
    return { relPath, type: 'PHOTO', exif };
  }

  const ext = VIDEO_TYPES[file.type];
  if (!ext) throw new MediaError('Formato non supportato: usa una foto (JPG, PNG, HEIC) o un video (MP4, MOV, WEBM)');
  const relPath = path.join(dir, `${id}${ext}`);
  await fs.writeFile(path.join(config.uploadDir, relPath), buffer);
  return { relPath, type: 'VIDEO', exif: {} };
}

export async function deleteMedia(relPath) {
  if (relPath) await fs.rm(path.join(config.uploadDir, relPath), { force: true });
}

export function mediaUrl(relPath) {
  return relPath ? `/api/media/${relPath.split(path.sep).join('/')}` : null;
}
