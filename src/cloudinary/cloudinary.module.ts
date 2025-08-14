import { Module, Global } from '@nestjs/common'; // 1. Importar Global
import { CloudinaryService } from './cloudinary.service';

@Global() // 2. Hacer el módulo global
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}