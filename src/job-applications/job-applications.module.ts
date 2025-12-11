import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { JobApplication } from './job-application.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([JobApplication]),
        CloudinaryModule,
    ],
    controllers: [JobApplicationsController],
    providers: [JobApplicationsService],
})
export class JobApplicationsModule { }
