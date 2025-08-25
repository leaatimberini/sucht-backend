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

  generateSignedDownloadUrl(publicId: string): { downloadUrl: string } {
    const cleanPublicId = publicId.substring(publicId.indexOf('/') + 1, publicId.lastIndexOf('.'));
    
    const downloadUrl = cloudinary.url(cleanPublicId, {
      flags: 'attachment',
    });
    
    return { downloadUrl };
  }
}