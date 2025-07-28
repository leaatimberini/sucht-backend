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
          
          // CORRECCIÓN: Nos aseguramos de que el resultado no sea undefined
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
}