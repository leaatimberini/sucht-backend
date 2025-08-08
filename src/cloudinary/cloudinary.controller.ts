import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { IsNotEmpty, IsString } from 'class-validator';

// DTO para validar el cuerpo de la petición
class DownloadUrlDto {
  @IsString()
  @IsNotEmpty()
  publicId: string;
}

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('signed-download-url')
  @UseGuards(JwtAuthGuard) // Protegemos el endpoint
  createSignedDownloadUrl(@Body() body: DownloadUrlDto) {
    // Extraemos el public_id de la URL completa que envía el frontend
    const publicIdWithFolder = new URL(body.publicId).pathname.split('/').slice(5).join('/').split('.').slice(0, -1).join('.');
    const signedUrl = this.cloudinaryService.getSignedDownloadUrl(publicIdWithFolder);
    return { downloadUrl: signedUrl };
  }
}