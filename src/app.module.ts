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
import { ConfigurationModule } from './configuration/configuration.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { PointTransactionsModule } from './point-transactions/point-transactions.module';
import { RewardsModule } from './rewards/rewards.module';
import { StoreModule } from './store/store.module';
import { AdminBirthdayModule } from './admin-birthday/admin-birthday.module';
import { BirthdayModule } from './birthday/birthday.module';
import { OwnerInvitationModule } from './owner-invitations/owner-invitations.module';
import { RaffleModule } from './raffles/raffle.module'; // <-- 1. Importar el nuevo módulo

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
      synchronize: false,
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
    ConfigurationModule,
    PaymentsModule,
    MailModule,
    PointTransactionsModule,
    RewardsModule,
    StoreModule,
    AdminBirthdayModule,
    BirthdayModule,
    OwnerInvitationModule,
    RaffleModule, // <-- 2. Añadir a la lista de imports
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}