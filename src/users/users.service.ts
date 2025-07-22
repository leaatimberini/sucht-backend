import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Encuentra un usuario por su email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Crea un nuevo usuario
  async create(registerAuthDto: RegisterAuthDto): Promise<User> {
    const { email, name, password } = registerAuthDto;

    // Revisa si el usuario ya existe
    const existingUser = await this.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Crea la nueva instancia de usuario
    const newUser = this.usersRepository.create({
      email,
      name,
      password, // El hash se hace automáticamente gracias al @BeforeInsert en la entidad
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      // Maneja otros posibles errores de la base de datos
      throw new InternalServerErrorException('Something went wrong, user not created');
    }
  }
}