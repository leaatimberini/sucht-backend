import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BenefitsService } from './benefits.service';
import { BenefitsController } from './benefits.controller';
import { Benefit } from './benefit.entity';
import { Redemption } from './redemption.entity';
import { PartnersModule } from 'src/partners/partners.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Benefit, Redemption]),
        PartnersModule,
        CloudinaryModule,
    ],
    controllers: [BenefitsController],
    providers: [BenefitsService],
    exports: [BenefitsService],
})
export class BenefitsModule { }
