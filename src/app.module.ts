import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { TicketTiersModule } from './ticket-tiers/ticket-tiers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ConfigurationModule } from './configuration/configuration.module'; // 1. IMPORTAR
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    
    // Módulos de la Aplicación
    UsersModule,
    AuthModule,
    EventsModule,
    TicketsModule,
    TicketTiersModule,
    DashboardModule,
    CloudinaryModule,
    NotificationsModule,
    ConfigurationModule, // 2. AÑADIR A LA LISTA
    PaymentsModule,
    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
