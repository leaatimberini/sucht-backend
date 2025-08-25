import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { SignedUrlDto } from './dto/signed-url.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cloudinaryService.uploadImage(file, 'sucht/uploads');
  }

  @Post('signed-download-url')
  @UseGuards(JwtAuthGuard)
  getSignedDownloadUrl(@Body() signedUrlDto: SignedUrlDto) {
    return this.cloudinaryService.generateSignedDownloadUrl(signedUrlDto.publicId);
  }
}