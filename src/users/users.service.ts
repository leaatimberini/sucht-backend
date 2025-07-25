import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
    const { email, name, password, dateOfBirth } = registerAuthDto; // <-- Se añade dateOfBirth
    const existingUser = await this.findOneByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    // Se añade dateOfBirth a la creación del usuario
    const newUser = this.usersRepository.create({ email, name, password, dateOfBirth: new Date(dateOfBirth), roles: [UserRole.CLIENT] });
    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong, user not created');
    }
  }

  // --- NUEVA FUNCIÓN PARA ACTUALIZAR EL PERFIL ---
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto, profileImageUrl?: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    
    // Asigna los nuevos valores del DTO al usuario
    Object.assign(user, updateProfileDto);

    // Si se subió una nueva imagen de perfil, se actualiza la URL
    if (profileImageUrl) {
      user.profileImageUrl = profileImageUrl;
    }

    return this.usersRepository.save(user);
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
      roles: [UserRole.CLIENT],
    });
    return this.usersRepository.save(newUser);
  }

  async inviteOrUpdateStaff(inviteStaffDto: InviteStaffDto): Promise<User> {
    const { email, roles } = inviteStaffDto;
    let user = await this.findOneByEmail(email);

    if (user) {
      // Combina los roles existentes con los nuevos, evitando duplicados
      const newRoles = Array.from(new Set([...user.roles, ...roles]));
      user.roles = newRoles;
      return this.usersRepository.save(user);
    } else {
      const nameParts = email.split('@');
      const tempName = nameParts[0];
      const invitationToken = randomBytes(32).toString('hex');
      
      const newUser = this.usersRepository.create({
        email,
        name: tempName,
        roles,
        invitationToken,
        password: undefined,
      });

      console.log(`INVITATION TOKEN for ${email}: ${invitationToken}`);
      return this.usersRepository.save(newUser);
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findStaff(): Promise<User[]> {
    const allUsers = await this.findAll();
    return allUsers.filter(user => !(user.roles.length === 1 && user.roles[0] === UserRole.CLIENT));
  }

  async findClients(): Promise<User[]> {
    const allUsers = await this.findAll();
    return allUsers.filter(user => user.roles.length === 1 && user.roles[0] === UserRole.CLIENT);
  }
}
