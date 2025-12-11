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

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto' // Permite subir PDFs, Docs, etc.
        },
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
        return { downloadUrl: imageUrl };
      }

      // "v1765306086/sucht/cvs/pfutzlkqe2lw8d9xoqe8.pdf"
      let path = imageUrl.substring(startIndex + uploadMarker.length);

      let version: string | undefined;
      // Chequear si empieza con v<numeros>/
      const versionMatch = path.match(/^v(\d+)\//);
      if (versionMatch) {
        version = versionMatch[1];
        // Remover la versión del path
        path = path.substring(versionMatch[0].length);
      }

      // "sucht/cvs/pfutzlkqe2lw8d9xoqe8.pdf"
      const lastDotIndex = path.lastIndexOf('.');
      let publicId = path;
      let format = '';

      if (lastDotIndex !== -1) {
        publicId = path.substring(0, lastDotIndex);
        format = path.substring(lastDotIndex + 1);
      }

      console.log('Generating signed URL for:', publicId, 'Format:', format, 'Version (ignored):', version);
      // Chequear si la config está cargada
      try {
        const config = cloudinary.config();
        console.log('Cloudinary Config Check - Cloud Name:', config.cloud_name, 'API Key present:', !!config.api_key);
      } catch (e) { console.error('Error checking config:', e); }

      const options: any = {
        flags: 'attachment', // Fuerza descarga
        secure: true,
        sign_url: true,
      };

      if (format) {
        options.format = format;
      }

      // NO incluimos la versión para evitar conflictos de firma. 
      // Cloudinary resolverá la última versión.

      const downloadUrl = cloudinary.url(publicId, options);
      console.log('Generated Signed URL:', downloadUrl);

      return { downloadUrl };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new InternalServerErrorException('No se pudo generar la URL de descarga.');
    }
  }
}