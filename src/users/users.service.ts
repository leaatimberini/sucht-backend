import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';
import { InviteStaffDto } from './dto/invite-staff.dto';

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
    const newUser = this.usersRepository.create({ email, name, password, roles: [UserRole.CLIENT] });
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
      roles: [UserRole.CLIENT],
    });
    return this.usersRepository.save(newUser);
  }

  async inviteOrUpdateStaff(inviteStaffDto: InviteStaffDto): Promise<User> {
    const { email, roles } = inviteStaffDto;
    let user = await this.findOneByEmail(email);

    if (user) {
      user.roles = roles;
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
        password: undefined, // <-- CORRECCIÓN: Usamos 'undefined' en lugar de 'null'
      });

      console.log(`INVITATION TOKEN for ${email}: ${invitationToken}`);
      return this.usersRepository.save(newUser);
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  // CORRECCIÓN: Reescribimos las búsquedas para ser más eficientes y compatibles
  async findStaff(): Promise<User[]> {
    return this.usersRepository.createQueryBuilder("user")
      .where("user.roles NOT IN (:...roles)", { roles: [UserRole.CLIENT] })
      .orderBy("user.createdAt", "DESC")
      .getMany();
  }

  async findClients(): Promise<User[]> {
    return this.usersRepository.createQueryBuilder("user")
      .where(":client = ANY(user.roles)", { client: UserRole.CLIENT })
      .andWhere("array_length(user.roles, 1) = 1") // Se asegura de que SOLO tenga el rol de cliente
      .orderBy("user.createdAt", "DESC")
      .getMany();
  }

  // Este método fue reemplazado por la lógica en 'inviteOrUpdateStaff', 
  // pero lo dejamos por si se necesita en otro lado. Si no, se podría borrar.
  async updateUserRole(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    user.roles = roles;
    return this.usersRepository.save(user);
  }
}
