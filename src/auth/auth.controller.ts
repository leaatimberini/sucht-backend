import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { User } from 'src/users/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

    // Enviar correo de bienvenida
    await this.authService.sendWelcomeEmail(user);

    return result;
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: { user: User }) {
    return this.authService.login(req.user);
  }

  // NUEVA RUTA PROTEGIDA
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // ✅ NUEVO ENDPOINT TEMPORAL PARA TEST DE MAIL
  @Post('test-mail')
async sendTestMail(@Body() body: { email: string }) {
  const fakeUser: Partial<User> = {
    email: body.email,
    name: 'Tester',
  };

  await this.authService.sendWelcomeEmail(fakeUser as User);

  return { message: `Correo enviado a ${body.email}` };
}
}
