import { Controller, Get, Post, Body, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Patch } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateEventDto } from './dto/update-event.dto';
import { cloudinaryStorage } from 'src/config/cloudinary.config';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage', {
    storage: cloudinaryStorage, // <-- USANDO CLOUDINARY
  }))
  create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    const flyerImageUrl = flyerImage ? flyerImage.path : undefined;
    return this.eventsService.create(createEventDto, flyerImageUrl);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage', {
    storage: cloudinaryStorage, // <-- USANDO CLOUDINARY
  }))
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    const flyerImageUrl = flyerImage ? flyerImage.path : undefined;
    return this.eventsService.update(id, updateEventDto, flyerImageUrl);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

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
