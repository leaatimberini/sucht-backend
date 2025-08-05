// backend/src/users/users.service.ts

import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly configService: ConfigurationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.findOneById(userId);
    const isPushSubscribed = await this.notificationsService.isUserSubscribed(userId);
    
    // Excluimos propiedades sensibles al devolver el perfil
    const { password, invitationToken, mpAccessToken, mpUserId, ...profileData } = user;

    return {
      ...profileData,
      isPushSubscribed,
    };
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) { throw new NotFoundException(`User with ID "${id}" not found`); }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }
  
  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async create(registerAuthDto: RegisterAuthDto): Promise<User> {
    const { email, name, password, dateOfBirth } = registerAuthDto;
    const lowerCaseEmail = email.toLowerCase();
    const existingUser = await this.findOneByEmail(email);
    if (existingUser) { throw new ConflictException('Email already registered'); }
    const newUser = this.usersRepository.create({ email: lowerCaseEmail, name, password, dateOfBirth: new Date(dateOfBirth), roles: [UserRole.CLIENT] });
    try { return await this.usersRepository.save(newUser); } catch (error) { throw new InternalServerErrorException('Something went wrong, user not created'); }
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const userToUpdate = await this.findOneById(userId);
    const { username, ...restOfDto } = updateProfileDto;

    if (username && username !== userToUpdate.username) {
      const existing = await this.findOneByUsername(username);
      if (existing && existing.id !== userId) {
        throw new ConflictException('El nombre de usuario ya está en uso.');
      }
    }
    
    Object.assign(userToUpdate, updateProfileDto);

    return this.usersRepository.save(userToUpdate);
  }

  async findOrCreateByEmail(email: string): Promise<User> {
    const lowerCaseEmail = email.toLowerCase();
    let user = await this.findOneByEmail(lowerCaseEmail);
    if (user) { return user; }
    const tempPassword = randomBytes(16).toString('hex');
    const nameParts = lowerCaseEmail.split('@');
    const tempName = nameParts[0];
    const newUser = this.usersRepository.create({ email: lowerCaseEmail, name: tempName, password: tempPassword, roles: [UserRole.CLIENT], });
    return this.usersRepository.save(newUser);
  }

  async inviteOrUpdateStaff(inviteStaffDto: InviteStaffDto): Promise<User> {
    const { email, roles } = inviteStaffDto;
    const lowerCaseEmail = email.toLowerCase();
    let user = await this.findOneByEmail(lowerCaseEmail);
    if (user) {
      const newRoles = Array.from(new Set([...user.roles, ...roles]));
        if (!newRoles.includes(UserRole.CLIENT)) {
            newRoles.push(UserRole.CLIENT);
        }
      user.roles = newRoles;
      return this.usersRepository.save(user);
    } else {
      const nameParts = lowerCaseEmail.split('@');
      const tempName = nameParts[0];
      const invitationToken = randomBytes(32).toString('hex');
      const newUser = this.usersRepository.create({ email: lowerCaseEmail, name: tempName, roles, invitationToken, password: '', });
      console.log(`INVITATION TOKEN for ${lowerCaseEmail}: ${invitationToken}`);
      return this.usersRepository.save(newUser);
    }
  }

  async findAll(): Promise<User[]> { return this.usersRepository.find({ order: { createdAt: 'DESC' } }); }
  async findStaff(): Promise<User[]> { const allUsers = await this.findAll(); return allUsers.filter(user => !(user.roles.length === 1 && user.roles[0] === UserRole.CLIENT)); }
  async findClients(): Promise<User[]> { const allUsers = await this.findAll(); return allUsers.filter(user => user.roles.length === 1 && user.roles[0] === UserRole.CLIENT); }
  
  async updateUserRoles(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.findOneById(id);
    const finalRoles = roles.length === 0 ? [UserRole.CLIENT] : Array.from(new Set([...roles, UserRole.CLIENT]));
    user.roles = finalRoles;
    return this.usersRepository.save(user);
  }
  
  async getAdminConfig(): Promise<{ serviceFee: number; accessToken: string | null }> {
    const serviceFeeStr = await this.configService.get('adminServiceFee');
    const adminUser = await this.findAdmin();

    return {
      serviceFee: serviceFeeStr ? parseFloat(serviceFeeStr) : 0,
      accessToken: adminUser?.mpAccessToken || null,
    };
  }

  // Se crea una función privada reutilizable para buscar por rol en el string
  private async findUserByRole(role: UserRole): Promise<User | null> {
    return this.usersRepository.createQueryBuilder("user")
      .where(`(
        user.roles = :role OR 
        user.roles LIKE :rolePrefix OR 
        user.roles LIKE :roleInfix OR 
        user.roles LIKE :roleSuffix
      )`, {
        role: role,
        rolePrefix: `${role},%`,
        roleInfix: `%,${role},%`,
        roleSuffix: `%,${role}`,
      })
      .getOne();
  }
  
  // CORRECCIÓN: findAdmin ahora usa la función de búsqueda correcta
  async findAdmin(): Promise<User | null> {
    return this.findUserByRole(UserRole.ADMIN);
  }
  
  // CORRECCIÓN: findOwner ahora usa la función de búsqueda correcta
  async findOwner(): Promise<User | null> {
    return this.findUserByRole(UserRole.OWNER);
  }
  
  async findUpcomingBirthdays(days: number): Promise<User[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const futureMonthDay = `${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
    
    let queryBuilder = this.usersRepository.createQueryBuilder('user');
    
    if (todayMonthDay <= futureMonthDay) {
      queryBuilder = queryBuilder.where("to_char(\"dateOfBirth\", 'MM-DD') BETWEEN :today AND :future", { today: todayMonthDay, future: futureMonthDay });
    } else {
      queryBuilder = queryBuilder.where(
        "(to_char(\"dateOfBirth\", 'MM-DD') >= :today OR to_char(\"dateOfBirth\", 'MM-DD') <= :future)",
        { today: todayMonthDay, future: futureMonthDay }
      );
    }

    queryBuilder = queryBuilder.andWhere(`(
      user.roles = :role OR 
      user.roles LIKE :rolePrefix OR 
      user.roles LIKE :roleInfix OR 
      user.roles LIKE :roleSuffix
    )`, {
      role: UserRole.CLIENT,
      rolePrefix: `${UserRole.CLIENT},%`,
      roleInfix: `%,${UserRole.CLIENT},%`,
      roleSuffix: `%,${UserRole.CLIENT}`,
    });

    return queryBuilder
      .orderBy("to_char(\"dateOfBirth\", 'MM-DD')")
      .getMany();
  }

  async updateMercadoPagoCredentials(userId: string, mpAccessToken: string, mpUserId: string): Promise<void> {
    await this.usersRepository.update(userId, { mpAccessToken, mpUserId });
  }
}