// src/verifier/verifier.module.ts
import { Module } from '@nestjs/common';
import { VerifierService } from './verifier.service';
import { VerifierController } from './verifier.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { StoreModule } from '../store/store.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [
    // Importamos los módulos que contienen los servicios que necesitamos
    TicketsModule,
    StoreModule,
    RewardsModule,
  ],
  controllers: [VerifierController],
  providers: [VerifierService],
})
export class VerifierModule {}