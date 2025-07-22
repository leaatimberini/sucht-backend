import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Busca un usuario por su email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Crea un nuevo usuario
  async create(registerAuthDto: RegisterAuthDto): Promise<User> {
    const { email, name, password } = registerAuthDto;

    const existingUser = await this.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const newUser = this.usersRepository.create({
      email,
      name,
      password,
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong, user not created');
    }
  }

  // --- NUEVAS FUNCIONES ---

  // 1. Encontrar todos los usuarios
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  // 2. Actualizar el rol de un usuario
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    user.role = role;
    return this.usersRepository.save(user);
  }
}