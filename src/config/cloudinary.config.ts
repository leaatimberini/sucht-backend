import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // Determina la carpeta de destino basado en el campo del archivo
    const folder = file.fieldname === 'profileImage' ? 'sucht/profiles' : 'sucht/events';
    return {
      folder: folder,
      allowed_formats: ['jpg', 'png', 'jpeg'],
      public_id: `sucht-${Date.now()}`, // Nombre de archivo único
    };
  },
});