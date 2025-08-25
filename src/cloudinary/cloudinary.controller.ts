import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { SignedUrlDto } from './dto/signed-url.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Endpoint genérico para subir un archivo.
   * Actualmente no se usa directamente desde el frontend, pero se mantiene por si es necesario.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER) // Protegido para que solo admins/dueños suban archivos genéricos
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cloudinaryService.uploadImage(file, 'sucht/uploads');
  }

  /**
   * Endpoint para generar una URL de descarga segura y forzada para un flyer.
   * Usado por la función de "Compartir en Instagram".
   */
  @Post('signed-download-url')
  @UseGuards(JwtAuthGuard) // Protegido para que solo usuarios logueados puedan descargar flyers
  getSignedDownloadUrl(@Body() signedUrlDto: SignedUrlDto) {
    return this.cloudinaryService.generateSignedDownloadUrl(signedUrlDto.publicId);
  }
}