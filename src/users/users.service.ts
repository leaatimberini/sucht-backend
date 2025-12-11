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
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ArrayContains, MoreThan, Between } from 'typeorm';
import { User, UserRole, GoogleReviewStatus } from './user.entity';
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
import { UserReward } from 'src/rewards/user-reward.entity';

export interface PaginatedUsers {
    data: User[];
    total: number;
    page: number;
    limit: number;
}

import { RewardsService } from 'src/rewards/rewards.service';
import { TelegramService } from 'src/notifications/telegram.service';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
        @Inject(forwardRef(() => RewardsService))
        private readonly rewardsService: RewardsService,
        private readonly telegramService: TelegramService,
        private readonly configurationService: ConfigurationService,
    ) { }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    private async calculateLoyaltyTier(userPoints: number) {
        const silverMin = parseInt(this.configService.get<string>('LOYALTY_TIER_SILVER_POINTS', '1000'), 10);
        const goldMin = parseInt(this.configService.get<string>('LOYALTY_TIER_GOLD_POINTS', '5000'), 10);
        const platinoMin = parseInt(this.configService.get<string>('LOYALTY_TIER_PLATINO_POINTS', '15000'), 10);
        const loyaltyTiers = [{ level: 'Bronce', minPoints: 0 }, { level: 'Plata', minPoints: silverMin }, { level: 'Oro', minPoints: goldMin }, { level: 'Platino', minPoints: platinoMin },];
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
            const savedUser = await this.usersRepository.save(newUser);

            // Send Invitation Email
            const inviteLink = `${this.configService.get('FRONTEND_URL')}/invitation?token=${invitationToken}`;
            try {
                await this.notificationsService.sendEmail(
                    lowerCaseEmail,
                    'Invitación a Sucht Club',
                    `<p>Has sido invitado a unirte al staff de Sucht Club.</p>
                     <p>Para completar tu registro, haz clic en el siguiente enlace:</p>
                     <a href="${inviteLink}">${inviteLink}</a>`
                );
            } catch (e) {
                console.error("Error sending invitation email", e);
                // Non-blocking error for now
            }

            return savedUser;
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
        if (!adminEmail) { throw new InternalServerErrorException('El email del admin para comisiones no está configurado.'); }
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.mpAccessToken')
            .where('user.email = :email', { email: adminEmail })
            .getOne();
    }

    async findOwnerForPayments(): Promise<User | null> {
        const ownerEmail = process.env.MP_OWNER_EMAIL;
        if (!ownerEmail) { throw new InternalServerErrorException('El email del dueño para pagos no está configurado.'); }
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
        if (!userId) { throw new NotFoundException('Se requiere un ID de usuario.'); }
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
        if (!userId) { throw new NotFoundException('Se requiere un ID de usuario.'); }
        const updatePayload = {
            taloAccessToken: accessToken,
            taloRefreshToken: refreshToken,
            taloUserId: taloUserId,
        };
        await this.usersRepository.update(userId, updatePayload);
    }

    async getHighValueUsers(minPoints: number = 500): Promise<User[]> {
        return this.usersRepository.find({
            where: {
                points: MoreThan(minPoints),
            },
            select: ['id', 'email', 'name', 'whatsappNumber', 'points'] // Select relevant fields for audience matching
        });
    }

    // --- MÉTODOS DE ADMINISTRACIÓN DE USUARIOS ---

    async adminUpdateProfile(userId: string, updateData: Partial<User>): Promise<User> {
        const user = await this.findOneById(userId);

        // Validar si el email o username ya existen si se estÃ¡n cambiando
        if (updateData.email && updateData.email !== user.email) {
            const existing = await this.findOneByEmail(updateData.email);
            if (existing) throw new ConflictException('El email ya estÃ¡ en uso.');
        }

        if (updateData.username && updateData.username !== user.username) {
            const existing = await this.findOneByUsername(updateData.username);
            if (existing && existing.id !== userId) throw new ConflictException('El usuario ya estÃ¡ en uso.');
        }

        Object.assign(user, updateData);
        // Date of birth conversion if string
        if (updateData.dateOfBirth) {
            user.dateOfBirth = new Date(updateData.dateOfBirth);
        }

        return this.usersRepository.save(user);
    }

    async adminForcePasswordChange(userId: string, newPassword: string): Promise<void> {
        const user = await this.findOneById(userId);
        user.password = await this.hashPassword(newPassword);
        // Limpiamos tokens de reset si existen para evitar conflictos
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await this.usersRepository.save(user);
    }

    async deleteUser(userId: string): Promise<void> {
        const user = await this.findOneById(userId);
        try {
            await this.usersRepository.delete(userId);
        } catch (error) {
            // Postgres error code 23503 is foreign_key_violation
            if (error.code === '23503') {
                throw new BadRequestException('No se puede eliminar el usuario porque tiene datos asociados (entradas, compras, etc.).');
            }
            throw new InternalServerErrorException('Error al eliminarr el usuario.');
        }
    }

    // --- GOOGLE REVIEWS LOGIC ---

    async onModuleInit() {
        // Registrar handlers de acciones de Telegram
        // Registrar handlers de acciones de Telegram
        this.telegramService.registerActionHandler(async (action, proposalId) => {
            if (action !== 'approve_review' && action !== 'reject_review') {
                return false;
            }
            // proposalId aquí será el userId ya que usaremos ese ID en los botones
            try {
                if (action === 'approve_review') {
                    await this.approveGoogleReview(proposalId);
                    await this.telegramService.sendNotification(`✅ Reseña aprobada para el usuario ${proposalId}`);
                } else if (action === 'reject_review') {
                    await this.rejectGoogleReview(proposalId);
                    await this.telegramService.sendNotification(`❌ Reseña rechazada para el usuario ${proposalId}`);
                }
                return true;
            } catch (error) {
                console.error('Error handling Telegram action for review:', error);
                await this.telegramService.sendNotification(`⚠️ Error procesando acción: ${error.message}`);
                return true; // Asumimos que intentamos manejarlo pero falló
            }
        });
    }

    async getGoogleReviewStatus(userId: string) {
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['rewards', 'rewards.reward'] // Cargar rewards para ver cual es de google
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        let reward: UserReward | null = null;
        if (user.googleReviewStatus === GoogleReviewStatus.APPROVED) {
            // Buscar el reward asignado por google review. 
            // Por simplicidad, buscamos el ultimo asignado o uno especifico si guardaramos el ID.
            // Como approveGoogleReview asigna uno nuevo, tomamos el mas reciente de tipo 'google' o asumimos el ultimo.
            // MEJORA: Podriamos filtrar por el rewardId especifico si lo guardamos, pero por ahora devolvemos el ultimo userReward asociado.
            // O mejor, buscamos userRewards que coincidan con la fecha de aprovacion +- instantes, o simplemente devolvemos el ultimo.
            // Para ser mas robustos en el futuro, podriamos guardar reviewRewardId en user.

            // Hack actual: devolver el último reward.
            if (user.rewards && user.rewards.length > 0) {
                // Ordenar por fecha desc
                user.rewards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                reward = user.rewards[0];
            }
        }

        return {
            status: user.googleReviewStatus,
            reward: reward
        };
    }

    async findGoogleReviewRequests(status?: GoogleReviewStatus) {
        const query = this.usersRepository.createQueryBuilder('user')
            .select(['user.id', 'user.name', 'user.email', 'user.googleReviewStatus', 'user.updatedAt']);

        if (status) {
            query.where('user.googleReviewStatus = :status', { status });
        } else {
            // Si no hay status, mostrar todos los que no sean NONE (o todos)
            query.where('user.googleReviewStatus != :none', { none: GoogleReviewStatus.NONE });
        }

        query.orderBy('user.updatedAt', 'DESC');

        return query.getMany();
    }

    async requestGoogleReviewValidation(userId: string) {
        const user = await this.findOneById(userId);

        if (user.googleReviewStatus === GoogleReviewStatus.APPROVED) {
            throw new BadRequestException('Ya has completado tu reseña y recibido tu premio.');
        }

        if (user.googleReviewStatus === GoogleReviewStatus.PENDING_VALIDATION) {
            return { message: 'Tu reseña ya está en proceso de validación.' };
        }

        user.googleReviewStatus = GoogleReviewStatus.PENDING_VALIDATION;
        await this.usersRepository.save(user);

        // Notificar al Staff vía Telegram
        const message = `🌟 *Nueva Reseña de Google por Validar*\n\nUsuario: ${user.name} (${user.email})\nID: \`${user.id}\`\n\nEl usuario indica que ha dejado una reseña en Google. Por favor verifica en Google Maps si existe una reseña reciente de este usuario.`;

        // Usamos un método especial en TelegramService para enviar botones personalizados
        // Si no existe, usamos sendProposal o lo creamos. 
        // Para simplificar, asumimos que sendProposal funciona con custom keys o añadiremos soporte.
        // HACK: Usamos sendProposal adaptando los IDs de acción.
        // La acción será 'approve_review' y 'reject_review'.

        await this.telegramService.sendReviewValidationRequest(user.name || 'Usuario', user.email || '', user.id);

        return { status: GoogleReviewStatus.PENDING_VALIDATION, message: 'Solicitud enviada' };
    }

    async approveGoogleReview(userId: string, rewardId?: string): Promise<User> {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        user.googleReviewStatus = GoogleReviewStatus.APPROVED;

        // Lógica de asignación de premio
        let rewardToGive: any = null;

        // 1. Si viene rewardId explícito, usarlo
        if (rewardId) {
            rewardToGive = await this.rewardsService.findOne(rewardId);
        }
        // 2. Si no, buscar si hay uno configurado globalmente en DB
        else {
            const configRewardId = await this.configurationService.get('google_review_reward_id');
            if (configRewardId) {
                this.logger.log(`Usando premio configurado globalmente: ${configRewardId}`);
                rewardToGive = await this.rewardsService.findOne(configRewardId);
            }
        }

        // 3. Fallback: Buscar "Google" o costo 0
        if (!rewardToGive) {
            this.logger.log('Fallback: Buscando premio automático por nombre/costo');
            const allRewards = await this.rewardsService.findAll(); // Optimizable
            rewardToGive = allRewards.find(r =>
                (r.name.toLowerCase().includes('google') || r.name.toLowerCase().includes('reseña')) && r.isActive
            );

            if (!rewardToGive) {
                rewardToGive = allRewards.find(r => r.pointsCost === 0 && r.isActive);
            }
        }

        if (rewardToGive) {
            // Check if user already obtained a reward for Google Review to prevent duplicates on re-approval
            const existingReward = await this.rewardsService.findUserRewardByOrigin(user.id, 'GOOGLE_REVIEW');

            if (!existingReward) {
                await this.rewardsService.assignRewardToUser(user.id, rewardToGive.id, 'GOOGLE_REVIEW');
                this.logger.log(`Premio asignado a user ${user.id}: ${rewardToGive.name}`);
            } else {
                this.logger.log(`Usuario ${user.id} ya tiene premio por Google Review (ID: ${existingReward.id}), no se asigna otro.`);
            }
        } else {
            this.logger.warn(`No se encontró premio para asignar a la reseña de user ${user.id}`);
        }

        return this.usersRepository.save(user);
    }

    async rejectGoogleReview(userId: string) {
        const user = await this.findOneById(userId);
        user.googleReviewStatus = GoogleReviewStatus.REJECTED;
        await this.usersRepository.save(user);
    }
}

const formatDateToInput = (date?: Date | string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};