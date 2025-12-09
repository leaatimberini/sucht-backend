// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { RaffleModule } from './raffles/raffle.module';
import { OrganizerModule } from './organizer/organizer.module';
import { TablesModule } from './tables/tables.module';
import { VerifierModule } from './verifier/verifier.module';
import { PartnersModule } from './partners/partners.module';
import { BenefitsModule } from './benefits/benefits.module';

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
      extra: {
        max: 20,
        connectionTimeoutMillis: 2000,
        idleTimeoutMillis: 30000,
        keepAlive: true,
      },
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        console.log(`[Request] ${req.method} ${req.url}`);
        console.log('Headers:', JSON.stringify(req.headers));
        // Body might be parsed or not depending on parser order, but for multipart it might show raw or parsed if multer runs later.
        // Actually multer runs in interceptor, so body here might be empty for multipart until body-parser/multer runs.
        // But body-parser for json/url-encoded runs earlier.
        // For multipart, we can't easily see body here without consuming stream.
        // But headers are crucial.
        next();
      })
      .forRoutes('*');
  }
}