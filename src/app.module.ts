import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketTiersModule } from './ticket-tiers/ticket-tiers.module';

@Module({
  imports: [
    // 1. Módulo de Configuración para leer variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Hace que las variables de entorno estén disponibles en toda la app
      envFilePath: '.env',
    }),
    
    // 2. Módulo de TypeORM para la conexión con PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10), // Usa '5432' como valor por defecto si DB_PORT no está definido
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true, // Carga automáticamente las entidades que definamos
      synchronize: true, // Sincroniza el esquema de la DB (¡Solo para desarrollo!)
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