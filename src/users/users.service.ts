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

  /**
   * Calcula el nivel de lealtad y el progreso del usuario de forma dinámica.
   */
  private async calculateLoyaltyTier(userPoints: number) {
    // Leemos los umbrales desde la configuración, con valores por defecto
    const silverMin = parseInt(await this.configService.get('loyalty_tier_silver_points') || '1000', 10);
    const goldMin = parseInt(await this.configService.get('loyalty_tier_gold_points') || '5000', 10);
    const platinoMin = parseInt(await this.configService.get('loyalty_tier_platino_points') || '15000', 10);

    const loyaltyTiers = [
      { level: 'Bronce', minPoints: 0 },
      { level: 'Plata', minPoints: silverMin },
      { level: 'Oro', minPoints: goldMin },
      { level: 'Platino', minPoints: platinoMin },
    ];

    const sortedTiers = [...loyaltyTiers].sort((a, b) => b.minPoints - a.minPoints);
    const currentTier = sortedTiers.find(tier => userPoints >= tier.minPoints) || loyaltyTiers[0];
    const nextTierIndex = loyaltyTiers.findIndex(tier => tier.level === currentTier.level) + 1;
    const nextTier = loyaltyTiers[nextTierIndex];

    let progress = 0;
    if (nextTier) {
      const pointsInCurrentTier = userPoints - currentTier.minPoints;
      const pointsNeededForNext = nextTier.minPoints - currentTier.minPoints;
      progress = Math.min(100, (pointsInCurrentTier / pointsNeededForNext) * 100);
    } else {
      progress = 100; // El usuario está en el nivel máximo
    }

    return {
      currentLevel: currentTier.level,
      nextLevel: nextTier ? nextTier.level : null,
      progressPercentage: progress,
      pointsToNextLevel: nextTier ? nextTier.minPoints - userPoints : 0,
    };
  }

  async getProfile(userId: string) {
    const user = await this.findOneById(userId);
    const isPushSubscribed = await this.notificationsService.isUserSubscribed(userId);
    // Ahora la llamada a la calculadora es asíncrona
    const loyaltyInfo = await this.calculateLoyaltyTier(user.points);
    
    const { password, invitationToken, mpAccessToken, ...profileData } = user;

    return {
      ...profileData,
      isPushSubscribed,
      isMpLinked: !!user.mpUserId,
      loyalty: loyaltyInfo,
    };
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) { throw new NotFoundException(`User with ID "${id}" not found`); }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: email.toLowerCase() })
      .addSelect('user.password')
      .getOne();
  }
  
  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async create(registerAuthDto: RegisterAuthDto): Promise<User> {
    const { email, name, password, dateOfBirth } = registerAuthDto;
    const lowerCaseEmail = email.toLowerCase();
    const existingUser = await this.findOneByEmail(lowerCaseEmail);
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
      const newUser = this.usersRepository.create({ email: lowerCaseEmail, name: tempName, roles, invitationToken });
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

  private async findUserByRole(role: UserRole): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder("user")
      .addSelect('user.mpAccessToken')
      .where(`:role = ANY(string_to_array(user.roles, ','))`, { role })
      .getOne();
  }
  
  async findAdmin(): Promise<User | null> {
    return this.findUserByRole(UserRole.ADMIN);
  }
  
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

    queryBuilder = queryBuilder.andWhere(`:role = ANY(string_to_array(user.roles, ','))`, { role: UserRole.CLIENT });

    return queryBuilder
      .orderBy("to_char(\"dateOfBirth\", 'MM-DD')")
      .getMany();
  }

  async updateMercadoPagoCredentials(
    userId: string,
    accessToken: string | null,
    mpUserId: string | number | null,
  ): Promise<void> {
    if (!userId) {
      throw new NotFoundException('Se requiere un ID de usuario.');
    }

    const updatePayload = {
      mpAccessToken: accessToken,
      mpUserId: mpUserId ? Number(mpUserId) : null,
    };

    await this.usersRepository.update(userId, updatePayload);
  }
}