// src/configuration/configuration.module.ts
import { Module, Global } from '@nestjs/common'; // 1. Importar Global
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from './configuration.entity';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';

@Global() // 2. Hacer el módulo global
@Module({
  imports: [TypeOrmModule.forFeature([Configuration])],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  exports: [ConfigurationService], // Asegúrate de que el servicio esté exportado
})
export class ConfigurationModule {}