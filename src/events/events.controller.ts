import { Controller, Get, Post, Body, Param, Delete, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Patch } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    const flyerImageUrl = flyerImage ? `/uploads/${flyerImage.filename}` : undefined;
    return this.eventsService.create(createEventDto, flyerImageUrl);
  }

  // NUEVO ENDPOINT PARA ACTUALIZAR
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('flyerImage', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() flyerImage?: Express.Multer.File,
  ) {
    const flyerImageUrl = flyerImage ? `/uploads/${flyerImage.filename}` : undefined;
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