import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigurationService } from 'src/configuration/configuration.service';
import { NotificationsService } from 'src/notifications/notifications.service'; // 1. IMPORTAR

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly configService: ConfigurationService,
    private readonly notificationsService: NotificationsService, // 2. INYECTAR
  ) {}

  // --- NUEVO MÉTODO PARA OBTENER EL PERFIL COMPLETO ---
  /**
   * Obtiene el perfil de un usuario y añade el estado de su suscripción a notificaciones.
   * @param userId El ID del usuario.
   * @returns El perfil del usuario con el flag `isPushSubscribed`.
   */
  async getProfile(userId: string) {
    const user = await this.findOneById(userId);
    const isPushSubscribed = await this.notificationsService.isUserSubscribed(userId);

    // Excluimos datos sensibles como el password del objeto que devolvemos
    const { password, invitationToken, ...profileData } = user;

    return {
      ...profileData,
      isPushSubscribed,
    };
  }

  // --- RESTO DE MÉTODOS SIN CAMBIOS ---

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) { throw new NotFoundException(`User with ID "${id}" not found`); }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto, profileImageUrl?: string): Promise<User> {
    if (updateProfileDto.username) {
      const existing = await this.findOneByUsername(updateProfileDto.username);
      if (existing && existing.id !== userId) {
        throw new ConflictException('El nombre de usuario ya está en uso.');
      }
    }
    const userToUpdate = await this.findOneById(userId);
    const { dateOfBirth, ...restOfDto } = updateProfileDto;
    Object.assign(userToUpdate, restOfDto);
    if (dateOfBirth) {
      userToUpdate.dateOfBirth = new Date(dateOfBirth);
    }
    if (profileImageUrl !== undefined) {
      userToUpdate.profileImageUrl = profileImageUrl;
    }
    return this.usersRepository.save(userToUpdate);
  }

  async findOrCreateByEmail(email: string): Promise<User> {
    let user = await this.findOneByEmail(email);
    if (user) { return user; }
    const tempPassword = randomBytes(16).toString('hex');
    const nameParts = email.split('@');
    const tempName = nameParts[0];
    const newUser = this.usersRepository.create({ email, name: tempName, password: tempPassword, roles: [UserRole.CLIENT], });
    return this.usersRepository.save(newUser);
  }

  async inviteOrUpdateStaff(inviteStaffDto: InviteStaffDto): Promise<User> {
    const { email, roles } = inviteStaffDto;
    let user = await this.findOneByEmail(email);
    if (user) {
      const newRoles = Array.from(new Set([...user.roles, ...roles]));
      user.roles = newRoles;
      return this.usersRepository.save(user);
    } else {
      const nameParts = email.split('@');
      const tempName = nameParts[0];
      const invitationToken = randomBytes(32).toString('hex');
      const newUser = this.usersRepository.create({ email, name: tempName, roles, invitationToken, password: undefined, });
      console.log(`INVITATION TOKEN for ${email}: ${invitationToken}`);
      return this.usersRepository.save(newUser);
    }
  }

  async findAll(): Promise<User[]> { return this.usersRepository.find({ order: { createdAt: 'DESC' } }); }
  async findStaff(): Promise<User[]> { const allUsers = await this.findAll(); return allUsers.filter(user => !(user.roles.length === 1 && user.roles[0] === UserRole.CLIENT)); }
  async findClients(): Promise<User[]> { const allUsers = await this.findAll(); return allUsers.filter(user => user.roles.length === 1 && user.roles[0] === UserRole.CLIENT); }
  
  async updateUserRoles(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.findOneById(id);
    const finalRoles = roles.includes(UserRole.ADMIN) ? roles : Array.from(new Set([...roles, UserRole.CLIENT]));
    user.roles = finalRoles;
    return this.usersRepository.save(user);
  }
  
  async getAdminConfig(): Promise<{ serviceFee: number; accessToken: string | null }> {
    const serviceFeeStr = await this.configService.get('adminServiceFee');
    const adminUser = await this.findAdmin();
    return {
      serviceFee: serviceFeeStr ? parseFloat(serviceFeeStr) : 0,
      accessToken: adminUser?.mercadoPagoAccessToken || null,
    };
  }

  async findAdmin(): Promise<User | null> {
    return this.usersRepository.createQueryBuilder("user")
      .where(":role = ANY(user.roles)", { role: UserRole.ADMIN })
      .getOne();
  }
  
  async findOwner(): Promise<User | null> {
    return this.usersRepository.createQueryBuilder("user")
      .where(":role = ANY(user.roles)", { role: UserRole.OWNER })
      .getOne();
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

}

