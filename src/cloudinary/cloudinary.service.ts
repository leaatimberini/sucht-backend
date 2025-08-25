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
      // Esta lógica extrae el public_id de la URL completa que guardamos en la base de datos.
      const urlSegments = imageUrl.split('/');
      const uploadIndex = urlSegments.findIndex(seg => seg === 'upload');
      // El public_id es todo lo que viene después de la versión (ej. v123456)
      const publicIdWithFormat = urlSegments.slice(uploadIndex + 2).join('/');
      const publicId = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
      
      const downloadUrl = cloudinary.url(publicId, {
        flags: 'attachment', // Esta bandera le dice al navegador que inicie una descarga.
      });
      
      return { downloadUrl };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo generar la URL de descarga desde la URL de la imagen proporcionada.');
    }
  }
}