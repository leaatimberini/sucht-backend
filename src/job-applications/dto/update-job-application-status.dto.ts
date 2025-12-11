import { IsEnum, IsNotEmpty } from 'class-validator';
import { JobApplicationStatus } from '../job-application.entity';

export class UpdateJobApplicationStatusDto {
    @IsNotEmpty()
    @IsEnum(JobApplicationStatus)
    status: JobApplicationStatus;
}
