import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { Partner } from './partner.entity';
import { PartnerView } from './partner-view.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Partner, PartnerView]),
        CloudinaryModule,
        MailModule,
    ],
    controllers: [PartnersController],
    providers: [PartnersService],
    exports: [PartnersService],
})
export class PartnersModule { }
