import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { VerifierService } from './verifier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';
import { IsNotEmpty, IsUUID } from 'class-validator';

// DTO para validar el ID del QR que llega desde el frontend
class ScanQrDto {
    @IsNotEmpty()
    @IsUUID('4')
    qrId: string;
}

@Controller('verifier')
@UseGuards(JwtAuthGuard, RolesGuard)
// Protegemos todo el controlador para los roles que pueden escanear
@Roles(UserRole.VERIFIER, UserRole.BARRA, UserRole.ADMIN, UserRole.OWNER)
export class VerifierController {
  constructor(private readonly verifierService: VerifierService) {}

  /**
   * Endpoint unificado para escanear cualquier tipo de QR (Tickets o Productos).
   * La lógica para determinar qué puede hacer cada rol está en el VerifierService.
   */
  @Post('scan')
  scan(
    @Req() req: { user: User },
    @Body() scanQrDto: ScanQrDto,
  ) {
    const user = req.user;
    return this.verifierService.scanQr(scanQrDto.qrId, user);
  }
}