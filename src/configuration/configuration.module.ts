import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from './configuration.entity';

@Module({
  // --- AÑADIDO: Importamos TypeOrmModule para la entidad Configuration ---
  imports: [TypeOrmModule.forFeature([Configuration])],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  // Exportamos el servicio para que otros módulos puedan usarlo
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
