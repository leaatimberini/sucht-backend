import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // <-- Importante: Solo los Admins pueden acceder a estas rutas
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Endpoint para establecer o actualizar una configuración.
   * Espera un body como: { "key": "adminServiceFee", "value": "2.5" }
   */
  @Post()
  setConfiguration(@Body() body: { key: string; value: string }) {
    return this.configService.set(body.key, body.value);
  }

  /**
   * Endpoint para obtener una configuración por su clave.
   * Ejemplo de ruta: GET /configuration/adminServiceFee
   */
  @Get(':key')
  getConfiguration(@Param('key') key: string) {
    return this.configService.get(key);
  }
}