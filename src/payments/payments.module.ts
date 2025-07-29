import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UsersModule } from 'src/users/users.module'; 
@Module({
  imports: [UsersModule],
  providers: [PaymentsService],
  controllers: [PaymentsController]
})
export class PaymentsModule {}
