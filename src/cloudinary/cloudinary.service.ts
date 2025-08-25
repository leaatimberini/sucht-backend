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
      // --- LÓGICA CORREGIDA Y ROBUSTA ---
      const uploadMarker = '/upload/';
      const startIndex = imageUrl.indexOf(uploadMarker);
      if (startIndex === -1) {
        throw new Error('URL de Cloudinary no válida.');
      }
      
      const path = imageUrl.substring(startIndex + uploadMarker.length);
      const pathWithoutVersion = path.substring(path.indexOf('/') + 1);
      const publicId = pathWithoutVersion.substring(0, pathWithoutVersion.lastIndexOf('.'));
      
      const downloadUrl = cloudinary.url(publicId, {
        flags: 'attachment',
      });
      
      return { downloadUrl };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo generar la URL de descarga.');
    }
  }
}