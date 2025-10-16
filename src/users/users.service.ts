// 
import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    BadRequestException,
    Inject,
    forwardRef,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ArrayContains, MoreThan, Between } from 'typeorm';
import { User, UserRole } from './user.entity';
import { RegisterAuthDto } from 'src/auth/dto/register-auth.dto';
import { randomBytes } from 'crypto';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';

export interface PaginatedUsers {
    data: User[];
    total: number;
    page: number;
    limit: number;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) {}
    
    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    private async calculateLoyaltyTier(userPoints: number) {
        const silverMin = parseInt(this.configService.get<string>('LOYALTY_TIER_SILVER_POINTS', '1000'), 10);
        const goldMin = parseInt(this.configService.get<string>('LOYALTY_TIER_GOLD_POINTS', '5000'), 10);
        const platinoMin = parseInt(this.configService.get<string>('LOYALTY_TIER_PLATINO_POINTS', '15000'), 10);
        const loyaltyTiers = [ { level: 'Bronce', minPoints: 0 }, { level: 'Plata', minPoints: silverMin }, { level: 'Oro', minPoints: goldMin }, { level: 'Platino', minPoints: platinoMin }, ];
        const sortedTiers = [...loyaltyTiers].sort((a, b) => b.minPoints - a.minPoints,);
        const currentTier = sortedTiers.find((tier) => userPoints >= tier.minPoints) || loyaltyTiers[0];
        const nextTierIndex = loyaltyTiers.findIndex((tier) => tier.level === currentTier.level) + 1;
        const nextTier = loyaltyTiers[nextTierIndex];
        let progress = 0;
        if (nextTier) {
            const pointsInCurrentTier = userPoints - currentTier.minPoints;
            const pointsNeededForNext = nextTier.minPoints - currentTier.minPoints;
            progress = Math.min(100, (pointsInCurrentTier / pointsNeededForNext) * 100,);
        } else { progress = 100; }
        return {
            currentLevel: currentTier.level,
            nextLevel: nextTier ? nextTier.level : null,
            progressPercentage: progress,
            pointsToNextLevel: nextTier ? nextTier.minPoints - userPoints : 0,
        };
    }

    public isBirthdayWeek(dateOfBirth: Date | null): boolean {
        if (!dateOfBirth) return false;
        const now = new Date();
        const birthdayThisYear = new Date(dateOfBirth);
        birthdayThisYear.setFullYear(now.getFullYear());
        const startOfBirthdayWeek = startOfWeek(birthdayThisYear, { weekStartsOn: 0, });
        const endOfBirthdayWeek = endOfWeek(birthdayThisYear, { weekStartsOn: 0 });
        return isWithinInterval(now, { start: startOfBirthdayWeek, end: endOfBirthdayWeek, });
    }

    async getProfile(userId: string) {
        const user = await this.findOneById(userId);
        const isPushSubscribed = await this.notificationsService.isUserSubscribed(userId);
        const loyaltyInfo = await this.calculateLoyaltyTier(user.points);
        const { password, invitationToken, mpAccessToken, ...profileData } = user;
        return {
            ...profileData,
            isPushSubscribed,
            isMpLinked: !!user.mpUserId,
            loyalty: loyaltyInfo,
            isBirthdayWeek: this.isBirthdayWeek(user.dateOfBirth),
        };
    }

    async findOneById(id: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }

    async findOneByEmail(email: string): Promise<User | null> {
        return this.usersRepository
            .createQueryBuilder('user')
            .where('user.email = :email', { email: email.toLowerCase() })
            .addSelect(['user.password', 'user.invitationToken', 'user.passwordResetToken', 'user.passwordResetExpires'])
            .getOne();
    }

    async findOneByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { username } });
    }

    async create(registerAuthDto: RegisterAuthDto): Promise<User> {
        const { email, name, password, dateOfBirth } = registerAuthDto;
        const lowerCaseEmail = email.toLowerCase();
        const existingUser = await this.findOneByEmail(lowerCaseEmail);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }
        
        const newUser = this.usersRepository.create({
            email: lowerCaseEmail,
            name,
            password,
            dateOfBirth: new Date(dateOfBirth),
            roles: [UserRole.CLIENT],
        });
        try {
            // El hook @BeforeInsert en la entidad se encarga de hashear la contraseña aquí
            return await this.usersRepository.save(newUser);
        } catch {
            throw new InternalServerErrorException(
                'Something went wrong, user not created',
            );
        }
    }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
    ): Promise<User> {
        const userToUpdate = await this.findOneById(userId);

        if (
            userToUpdate.dateOfBirth &&
            updateProfileDto.dateOfBirth &&
            formatDateToInput(userToUpdate.dateOfBirth) !==
            formatDateToInput(updateProfileDto.dateOfBirth)
        ) {
            throw new BadRequestException(
                'La fecha de nacimiento no se puede modificar una vez establecida.',
            );
        }

        const { username } = updateProfileDto;
        if (username && username !== userToUpdate.username) {
            const existing = await this.findOneByUsername(username);
            if (existing && existing.id !== userId) {
                throw new ConflictException('El nombre de usuario ya está en uso.');
            }
        }
        
        // FIX: Se utiliza directamente el DTO, que no contiene campos sensibles.
        // Esto corrige el error de TypeScript y es seguro.
        Object.assign(userToUpdate, updateProfileDto);
        return this.usersRepository.save(userToUpdate);
    }
    
    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const { currentPassword, newPassword } = changePasswordDto;
        
        const userWithPassword = await this.findOneByEmail((await this.findOneById(userId)).email);

        if (!userWithPassword?.password) {
            throw new BadRequestException('No se pudo verificar la contraseña actual. Es posible que hayas sido invitado y necesites establecer una contraseña primero.');
        }
        
        const isPasswordMatching = await bcrypt.compare(currentPassword, userWithPassword.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('La contraseña actual es incorrecta.');
        }
        
        userWithPassword.password = await this.hashPassword(newPassword);
        await this.usersRepository.save(userWithPassword);
    }

    async findOrCreateByEmail(email: string): Promise<User> {
        const lowerCaseEmail = email.toLowerCase();
        let user = await this.findOneByEmail(lowerCaseEmail);

        if (user) {
            return user;
        }

        const tempName = lowerCaseEmail.split('@')[0];
        const invitationToken = randomBytes(32).toString('hex');

        const newUser = this.usersRepository.create({
            email: lowerCaseEmail,
            name: tempName,
            roles: [UserRole.CLIENT],
            invitationToken,
        });

        console.log(
            `INVITATION TOKEN for new invited user ${lowerCaseEmail}: ${invitationToken}`,
        );
        return this.usersRepository.save(newUser);
    }

    async completeInvitation(dto: CompleteInvitationDto): Promise<User> {
        const { token, name, dateOfBirth, password } = dto;

        const user = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.invitationToken = :token', { token })
            .getOne();
            
        if (!user) {
            throw new BadRequestException(
                'El token de invitación no es válido o ha expirado.',
            );
        }

        user.name = name;
        user.dateOfBirth = new Date(dateOfBirth);
        user.password = await this.hashPassword(password);
        user.invitationToken = null;

        return this.usersRepository.save(user);
    }

    // --- NUEVO MÉTODO SEGURO PARA EL FLUJO DE "OLVIDÉ MI CONTRASEÑA" ---
    async resetUserPassword(userId: string, newPassword: string): Promise<User> {
        const user = await this.findOneById(userId);
        user.password = await this.hashPassword(newPassword);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        return this.usersRepository.save(user);
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
            const tempName = lowerCaseEmail.split('@')[0];
            const invitationToken = randomBytes(32).toString('hex');
            const newUser = this.usersRepository.create({
                email: lowerCaseEmail,
                name: tempName,
                roles,
                invitationToken,
            });
            console.log(
                `INVITATION TOKEN for ${lowerCaseEmail}: ${invitationToken}`,
            );
            return this.usersRepository.save(newUser);
        }
    }

    async findAllWithoutPagination(): Promise<User[]> {
        return this.usersRepository.find({ order: { createdAt: 'DESC' } });
    }

    async findAll(paginationQuery: PaginationQueryDto): Promise<PaginatedUsers> {
        const { page, limit } = paginationQuery;
        const skip = (page - 1) * limit;

        const [data, total] = await this.usersRepository.findAndCount({
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return { data, total, page, limit };
    }

    async findStaff(paginationQuery: PaginationQueryDto): Promise<PaginatedUsers> {
        const { page, limit } = paginationQuery;
        const skip = (page - 1) * limit;

        const staffRoles = [UserRole.ADMIN, UserRole.OWNER, UserRole.ORGANIZER, UserRole.RRPP, UserRole.VERIFIER, UserRole.BARRA];
        
        const queryBuilder = this.usersRepository.createQueryBuilder("user")
            .where("user.roles && :roles", { roles: staffRoles });

        const total = await queryBuilder.getCount();
        const data = await queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit).getMany();

        return { data, total, page, limit };
    }

    async findClients(paginationQuery: PaginationQueryDto): Promise<PaginatedUsers> {
        const { page, limit } = paginationQuery;
        const skip = (page - 1) * limit;

        const [data, total] = await this.usersRepository.findAndCount({
            where: { roles: ArrayContains([UserRole.CLIENT]) },
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return { data, total, page, limit };
    }

    async updateUserRoles(id: string, roles: UserRole[]): Promise<User> {
        const user = await this.findOneById(id);
        const finalRoles =
            roles.length === 0
                ? [UserRole.CLIENT]
                : Array.from(new Set([...roles, UserRole.CLIENT]));
        user.roles = finalRoles;
        return this.usersRepository.save(user);
    }

    async getAdminConfig(): Promise<{
        serviceFee: number;
        accessToken: string | null;
    }> {
        const serviceFeeStr = this.configService.get<string>('ADMIN_SERVICE_FEE');
        const adminUser = await this.findAdminForPayments();
        return {
            serviceFee: serviceFeeStr ? parseFloat(serviceFeeStr) : 0,
            accessToken: adminUser?.mpAccessToken || null,
        };
    }

    async findAdminForPayments(): Promise<User | null> {
        const adminEmail = process.env.MP_ADMIN_EMAIL;
        if (!adminEmail) { throw new InternalServerErrorException('El email del admin para comisiones no está configurado.');}
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.mpAccessToken')
            .where('user.email = :email', { email: adminEmail })
            .getOne();
    }

    async findOwnerForPayments(): Promise<User | null> {
        const ownerEmail = process.env.MP_OWNER_EMAIL;
        if (!ownerEmail) { throw new InternalServerErrorException('El email del dueño para pagos no está configurado.');}
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.mpAccessToken')
            .where('user.email = :email', { email: ownerEmail })
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
            queryBuilder = queryBuilder.where(
                `to_char("dateOfBirth", 'MM-DD') BETWEEN :today AND :future`,
                { today: todayMonthDay, future: futureMonthDay },
            );
        } else {
            queryBuilder = queryBuilder.where(
                `(to_char("dateOfBirth", 'MM-DD') >= :today OR to_char("dateOfBirth", 'MM-DD') <= :future)`,
                { today: todayMonthDay, future: futureMonthDay },
            );
        }

        queryBuilder = queryBuilder.andWhere(':role = ANY(user.roles)', {
            role: UserRole.CLIENT,
        });

        return queryBuilder
            .orderBy(`to_char("dateOfBirth", 'MM-DD')`)
            .getMany();
    }
    
    async save(user: User): Promise<User> {
        return this.usersRepository.save(user);
    }

    async findUserByPasswordResetToken(token: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: MoreThan(new Date()),
            },
        });
    }

    async updateMercadoPagoCredentials(
        userId: string,
        accessToken: string | null,
        mpUserId: string | number | null,
    ): Promise<void> {
        if (!userId) { throw new NotFoundException('Se requiere un ID de usuario.');}
        const updatePayload = {
            mpAccessToken: accessToken,
            mpUserId: mpUserId ? Number(mpUserId) : null,
        };
        await this.usersRepository.update(userId, updatePayload);
    }
    async updateTaloCredentials(
        userId: string,
        accessToken: string | null,
        refreshToken: string | null,
        taloUserId: string | null,
    ): Promise<void> {
        if (!userId) { throw new NotFoundException('Se requiere un ID de usuario.');}
        const updatePayload = {
            taloAccessToken: accessToken,
            taloRefreshToken: refreshToken,
            taloUserId: taloUserId,
        };
        await this.usersRepository.update(userId, updatePayload);
    }

}

const formatDateToInput = (date?: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};