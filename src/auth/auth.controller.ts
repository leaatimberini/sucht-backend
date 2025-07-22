import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common'; // <-- AÑADIR Get
import { UsersService } from 'src/users/users.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { User } from 'src/users/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // <-- IMPORTAR EL GUARDIA

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() registerAuthDto: RegisterAuthDto) {
    const user = await this.usersService.create(registerAuthDto);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: { user: User }) {
    return this.authService.login(req.user);
  }

  // NUEVA RUTA PROTEGIDA
  @UseGuards(JwtAuthGuard) // <-- Este es el portero. Solo deja pasar si el token es válido.
  @Get('profile')
  getProfile(@Request() req) {
    return req.user; // req.user es el payload que retornamos en JwtStrategy.validate
  }
}