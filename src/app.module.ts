import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketTiersModule } from './ticket-tiers/ticket-tiers.module';
// --- 1. IMPORTA ESTOS DOS MÓDULOS ---
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    // 1. Módulo de Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // --- 2. AGREGA ESTE MÓDULO AQUÍ ---
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // La carpeta donde se guardan las imágenes
      serveRoot: '/uploads', // La ruta URL pública
    }),

    // 2. Módulo de TypeORM
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true,
    }),
    
    UsersModule,
    AuthModule,
    EventsModule,
    TicketsModule,
    TicketTiersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}