import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScratchController } from './scratch.controller';
import { ScratchService } from './scratch.service';
import { ScratchPrize } from './items/scratch-prize.entity';
import { ScratchAttempt } from './items/scratch-attempt.entity';
import { RewardsModule } from 'src/rewards/rewards.module';
import { TicketsModule } from 'src/tickets/tickets.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ScratchPrize, ScratchAttempt]),
        RewardsModule,
        TicketsModule
    ],
    controllers: [ScratchController],
    providers: [ScratchService],
    exports: [ScratchService]
})
export class ScratchModule { }
