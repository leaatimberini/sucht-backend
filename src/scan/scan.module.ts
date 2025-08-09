// backend/src/scan/scan.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { TicketsModule } from '../tickets/tickets.module';
import { BirthdayModule } from '../birthday/birthday.module';

@Module({
  imports: [
    forwardRef(() => TicketsModule), // Usamos forwardRef para evitar dependencias circulares
    forwardRef(() => BirthdayModule),
  ],
  controllers: [ScanController],
  providers: [ScanService],
})
export class ScanModule {}