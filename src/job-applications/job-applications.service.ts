import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication, JobApplicationStatus } from './job-application.entity';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class JobApplicationsService {
    constructor(
        @InjectRepository(JobApplication)
        private jobApplicationsRepository: Repository<JobApplication>,
        private readonly cloudinaryService: CloudinaryService, // 👈 Inyectamos
    ) { }

    async create(createJobApplicationDto: CreateJobApplicationDto): Promise<JobApplication> {
        const application = this.jobApplicationsRepository.create(createJobApplicationDto);
        return this.jobApplicationsRepository.save(application);
    }

    async findAll(): Promise<JobApplication[]> {
        const applications = await this.jobApplicationsRepository.find({
            order: { createdAt: 'DESC' },
        });

        // Firmamos las URLs de CV
        return applications.map(app => {
            if (app.cvUrl) {
                try {
                    const { downloadUrl } = this.cloudinaryService.generateSignedDownloadUrl(app.cvUrl);
                    app.cvUrl = downloadUrl;
                } catch (error) {
                    console.error(`Error signing URL for app ${app.id}:`, error);
                }
            }
            return app;
        });
    }

    async findOne(id: string): Promise<JobApplication> {
        const application = await this.jobApplicationsRepository.findOneBy({ id });
        if (!application) {
            throw new NotFoundException(`Application with ID "${id}" not found`);
        }
        if (application.cvUrl) {
            try {
                const { downloadUrl } = this.cloudinaryService.generateSignedDownloadUrl(application.cvUrl);
                application.cvUrl = downloadUrl;
            } catch (error) {
                console.error(`Error signing URL for app ${application.id}:`, error);
            }
        }
        return application;
    }

    async updateStatus(id: string, updateStatusDto: UpdateJobApplicationStatusDto): Promise<JobApplication> {
        const application = await this.findOne(id); // findOne ya firma la URL, pero aquí solo necesitamos actualizar status
        // NOTA: al guardar, no deberíamos guardar la URL firmada en la BD.
        // findOne devuelve la entidad modificada en memoria.
        // TypeORM save podría actualizarlo si no tenemos cuidado.
        // Recuperamos la raw de nuevo para evitar guardar la firma?
        // O mejor: separamos lógica de firma?

        // Mejor estrategia: update directo a la DB y luego retornar findOne
        await this.jobApplicationsRepository.update(id, { status: updateStatusDto.status });
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        const result = await this.jobApplicationsRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Application with ID "${id}" not found`);
        }
    }
}
