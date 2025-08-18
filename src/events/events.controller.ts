import { Controller, Get, Post, Body, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Patch, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateEventDto } from './dto/update-event.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { unlink } from 'fs/promises';
import { Public } from 'src/auth/decorators/public.decorator';

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
    let flyerImageUrl: string | undefined;
    if (flyerImage) {
      const uploadResult = await this.cloudinaryService.uploadImage(flyerImage, 'sucht/events');
      flyerImageUrl = uploadResult.secure_url;
      try {
        await unlink(flyerImage.path);
      } catch (err) {
        console.error('Error removing temporary file:', err);
      }
    }
    return this.eventsService.update(id, updateEventDto, flyerImageUrl);
  }

  @Post(':id/request-confirmation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  requestConfirmation(@Param('id') id: string) {
    return this.eventsService.requestConfirmation(id);
  }

  @Public()
  @Get()
  findAll() { 
    return this.eventsService.findAll(); 
  }
  
  /**
   * NUEVO ENDPOINT: Devuelve todos los eventos (publicados o no) para el panel de admin.
   */
  @Get('all-for-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  findAllForAdmin() {
      return this.eventsService.findAllForAdmin();
  }

  @Public()
  @Get('list/for-select')
  findAllForSelect() {
    return this.eventsService.findAllForSelect();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) { 
    return this.eventsService.findOne(id); 
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) { 
    return this.eventsService.remove(id); 
  }
}