import { Controller, Body, UseGuards, Get, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Endpoint público para obtener configuraciones (ej: IDs de tracking para el frontend).
   */
  @Public() // Marcado como público para que cualquiera pueda acceder
  @Get()
  getAllConfigurations() {
    return this.configService.getFormattedConfig();
  }

  /**
   * Endpoint protegido para que solo Owners y Admins puedan actualizar la configuración.
   */
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un 204 No Content en caso de éxito
  updateConfigurations(@Body() updateConfigurationDto: UpdateConfigurationDto) {
    return this.configService.updateConfiguration(updateConfigurationDto);
  }
}