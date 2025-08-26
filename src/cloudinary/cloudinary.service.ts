import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';
import * as stream from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(new InternalServerErrorException(error.message));
          }
          if (result) {
            resolve(result);
          } else {
            reject(new InternalServerErrorException('La subida a Cloudinary falló sin un error explícito.'));
          }
        },
      );
      stream.Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  generateSignedDownloadUrl(imageUrl: string): { downloadUrl: string } {
    try {
      const uploadMarker = '/upload/';
      const startIndex = imageUrl.indexOf(uploadMarker);
      if (startIndex === -1) {
        throw new Error('URL de Cloudinary no válida.');
      }
      
      const path = imageUrl.substring(startIndex + uploadMarker.length);
      const publicIdWithVersion = path.substring(0, path.lastIndexOf('.'));
      
      // --- LÓGICA CORREGIDA ---
      // Usamos el public_id completo (incluyendo la versión) y forzamos HTTPS.
      const downloadUrl = cloudinary.url(publicIdWithVersion, {
        flags: 'attachment',
        secure: true, // Fuerza el uso de HTTPS
      });
      
      return { downloadUrl };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo generar la URL de descarga.');
    }
  }
}