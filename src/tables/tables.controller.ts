import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe, Patch, Req, Delete } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { User, UserRole } from 'src/users/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTablePositionDto } from './dto/update-table-position.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { CreateManualReservationDto } from './dto/create-manual-reservation.dto';
import { SetCategoryPriceDto } from './dto/set-category-price.dto';

@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) { }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.tablesService.createCategory(createCategoryDto.name);
  }

  @Post('category/price')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  setCategoryPrice(@Body() dto: SetCategoryPriceDto) {
    return this.tablesService.setCategoryPrice(dto.eventId, dto.categoryId, dto.price, dto.capacity, dto.depositPrice);
  }


  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  findAllCategories() {
    return this.tablesService.findAllCategories();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createTable(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.createTable(
      createTableDto.tableNumber,
      createTableDto.categoryId,
      createTableDto.eventId,
    );
  }

  @Get('event/:eventId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  findTablesForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.tablesService.findTablesForEvent(eventId);
  }

  @Get('reservations/event/:eventId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  getReservationsForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.tablesService.getReservationsForEvent(eventId);
  }

  @Patch(':id/position')
  @Roles(UserRole.ADMIN)
  updateTablePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePositionDto: UpdateTablePositionDto
  ) {
    return this.tablesService.updateTablePosition(id, updatePositionDto.positionX, updatePositionDto.positionY);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  updateTableStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateTableStatusDto
  ) {
    return this.tablesService.updateTableStatus(id, updateStatusDto.status);
  }

  @Post('reservations/manual')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER)
  reserveTableManually(
    @Req() req: { user: User },
    @Body() createManualReservationDto: CreateManualReservationDto
  ) {
    return this.tablesService.reserveTableManually(req.user, createManualReservationDto);
  }

  @Delete('reservations/:id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  deleteReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.tablesService.deleteReservation(id);
  }
}