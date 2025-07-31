// src/configuration/configuration.controller.ts

import { Controller, Body, UseGuards, Get, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('configuration')
// CAMBIO CRÍTICO: Se elimina la guardia a nivel de controlador.
// Ya no se protege todo por defecto.
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Endpoint público para obtener las configuraciones de seguimiento.
   * Devuelve un objeto como: { "metaPixelId": "123", "googleAnalyticsId": "G-XYZ" }
   */
  @Get()
  // FIX: Este endpoint ahora es PÚBLICO. No tiene @UseGuards.
  // El decorador @Roles no tiene efecto si no hay un RolesGuard activado.
  getAllConfigurations() {
    return this.configService.getFormattedConfig();
  }

  /**
   * Endpoint para que el Admin actualice una o más configuraciones.
   * Usamos PATCH porque es una actualización parcial.
   * Espera un body como: { "metaPixelId": "...", "googleAnalyticsId": "..." }
   */
  @Patch()
  // MANTENIDO: Este endpoint para actualizar DEBE seguir protegido.
  // Se mueven las guardias aquí, a nivel de método.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 para éxito sin contenido.
  updateConfigurations(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configService.updateConfiguration(updateConfigurationDto);
  }
}