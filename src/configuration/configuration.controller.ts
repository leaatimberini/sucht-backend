import { Controller, Body, UseGuards, Get, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto'; // Importamos el DTO
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@Controller('configuration')
@UseGuards(JwtAuthGuard, RolesGuard) // Protegemos todo el controlador
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Endpoint para que el Admin obtenga TODAS las configuraciones a la vez.
   * Devuelve un objeto como: { "metaPixelId": "123", "googleAnalyticsId": "G-XYZ" }
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER) // El Dueño también debería poder ver la config
  getAllConfigurations() {
    return this.configService.getFormattedConfig();
  }

  /**
   * Endpoint para que el Admin actualice una o más configuraciones.
   * Usamos PATCH porque es una actualización parcial.
   * Espera un body como: { "metaPixelId": "...", "googleAnalyticsId": "..." }
   */
  @Patch()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 en lugar de 200 para indicar éxito sin contenido
  updateConfigurations(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configService.updateConfiguration(updateConfigurationDto);
  }
}