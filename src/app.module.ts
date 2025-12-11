// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { RaffleModule } from './raffles/raffle.module';
import { OrganizerModule } from './organizer/organizer.module';
import { TablesModule } from './tables/tables.module';
import { VerifierModule } from './verifier/verifier.module';
import { PartnersModule } from './partners/partners.module';
import { BenefitsModule } from './benefits/benefits.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { MarketingModule } from './marketing/marketing.module'; // Added MarketingModule import
import { CerebroModule } from './cerebro/cerebro.module';
import { ScratchModule } from './scratch/scratch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'), // Changed from DB_NAME to DB_DATABASE to match original
        autoLoadEntities: true, // Kept from original
        synchronize: false,
        logging: ['error', 'warn'], // Reduced logging
        extra: { // Kept from original
          max: 20,
          connectionTimeoutMillis: 2000,
          idleTimeoutMillis: 30000,
          keepAlive: true,
        },
      }),
      inject: [ConfigService],
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
    RaffleModule,
    OrganizerModule,
    TablesModule,
    VerifierModule,
    PartnersModule,
    BenefitsModule,
    JobApplicationsModule,
    MarketingModule,
    CerebroModule,
    ScratchModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }