// backend/src/cloudinary/cloudinary.service.ts

import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import * as toStream from 'buffer-to-stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: folder },
        (error, result) => {
          if (error) return reject(error);
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Cloudinary returned an undefined result."));
          }
        },
      );
      toStream(file.buffer).pipe(upload);
    });
  }

  // ===== NUEVO MÉTODO AÑADIDO =====
  /**
   * Genera una URL firmada para forzar la descarga de un archivo.
   * @param publicId El public_id del archivo en Cloudinary.
   * @returns Una URL de descarga válida por 1 hora.
   */
  getSignedDownloadUrl(publicId: string): string {
    return cloudinary.utils.private_download_url(publicId, '', {
      type: 'upload',
      attachment: true, // Esto fuerza la descarga
      expires_at: Math.floor(Date.now() / 1000) + 3600, // Válida por 1 hora
    });
  }
}