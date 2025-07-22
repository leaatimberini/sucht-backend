import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // Importa la entidad User
  providers: [UsersService],
  exports: [UsersService], // Exportamos el servicio para usarlo en otros módulos (como el de Auth)
})
export class UsersModule {}