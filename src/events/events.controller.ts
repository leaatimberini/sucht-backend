import { Controller, Get, Post, Body, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Patch } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateEventDto } from './dto/update-event.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage'))
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    let flyerImageUrl: string | undefined = undefined;
    if (flyerImage) {
      const uploadResult = await this.cloudinaryService.uploadImage(flyerImage, 'sucht/events');
      flyerImageUrl = uploadResult.secure_url;
    }
    return this.eventsService.create(createEventDto, flyerImageUrl);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage'))
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    let flyerImageUrl: string | undefined = undefined;
    if (flyerImage) {
      const uploadResult = await this.cloudinaryService.uploadImage(flyerImage, 'sucht/events');
      flyerImageUrl = uploadResult.secure_url;
    }
    return this.eventsService.update(id, updateEventDto, flyerImageUrl);
  }
  
  // --- ENDPOINT AÑADIDO ---
  @Post(':id/request-confirmation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  requestConfirmation(@Param('id') id: string) {
    return this.eventsService.requestConfirmation(id);
  }

  // --- El resto de los endpoints no se modifican ---
  @Get()
  findAll() { return this.eventsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.eventsService.findOne(id); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.eventsService.remove(id); }
}
