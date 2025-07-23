import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm'; // <-- IMPORTAR 'Not'
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(registerAuthDto: RegisterAuthDto): Promise<User> {
    const { email, name, password } = registerAuthDto;
    const existingUser = await this.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const newUser = this.usersRepository.create({ email, name, password });
    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong, user not created');
    }
  }

  async findOrCreateByEmail(email: string): Promise<User> {
    let user = await this.findOneByEmail(email);
    if (user) {
      return user;
    }
    const tempPassword = randomBytes(16).toString('hex');
    const nameParts = email.split('@');
    const tempName = nameParts[0];
    const newUser = this.usersRepository.create({
      email,
      name: tempName,
      password: tempPassword,
      role: UserRole.CLIENT,
    });
    return this.usersRepository.save(newUser);
  }

  // --- MÉTODOS ACTUALIZADOS Y NUEVOS ---

  // Devuelve todos los usuarios (lo mantenemos por si es útil)
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }
  
  // Devuelve solo al personal (todos menos los clientes)
  async findStaff(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: Not(UserRole.CLIENT) },
      order: { createdAt: 'DESC' },
    });
  }

  // Devuelve solo a los clientes
  async findClients(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.CLIENT },
      order: { createdAt: 'DESC' },
    });
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    user.role = role;
    return this.usersRepository.save(user);
  }
}