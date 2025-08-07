import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // --- Endpoints de Gestión para Admin ---

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.storeService.createProduct(createProductDto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.storeService.updateProduct(id, updateProductDto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProduct(@Param('id') id: string) {
    return this.storeService.removeProduct(id);
  }

  // --- Endpoints Públicos / para Clientes ---

  @Public() // Todos pueden ver los productos
  @Get('products')
  findAllProducts() {
    return this.storeService.findAllProducts();
  }

  @Public()
  @Get('products/:id')
  findOneProduct(@Param('id') id: string) {
    return this.storeService.findOneProduct(id);
  }
}