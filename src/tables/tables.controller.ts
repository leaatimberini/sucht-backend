import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTableDto } from './dto/create-table.dto';

@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.tablesService.createCategory(createCategoryDto.name);
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
}