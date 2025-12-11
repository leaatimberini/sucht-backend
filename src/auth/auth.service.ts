import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';
import { randomBytes, createHash } from 'crypto';
import { ConfigurationService } from 'src/configuration/configuration.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
        private configurationService: ConfigurationService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user || !user.password) {
            return null;
        }
        const isPasswordMatching = await bcrypt.compare(pass, user.password);
        if (isPasswordMatching) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: User) {
        const cleanRoles = (roles: any): string[] => {
            if (Array.isArray(roles)) {
                return roles;
            }
            return [];
        };

        const payload = {
            email: user.email,
            sub: user.id,
            roles: cleanRoles(user.roles)
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken: accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: cleanRoles(user.roles),
                profileImageUrl: user.profileImageUrl,
                isMpLinked: !!user.mpUserId,
                rrppCommissionRate: user.rrppCommissionRate,
            }
        };
    }

    async sendWelcomeEmail(user: User) {
        if (!user.email) return;

        await this.mailService.sendStyledMail(
            user.email,
            '🎉 ¡Bienvenido a SUCHT!',
            `Hola ${user.name || ''} 👋`,
            `<p>Gracias por registrarte en <strong>SUCHT</strong>.</p>
             <p>Desde ahora vas a poder acceder a eventos, entradas, promociones y más 🎶🍸</p>`,
            { text: 'Ir a mi cuenta', url: 'https://sucht.com.ar/mi-cuenta' }
        );
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            return { message: 'Si el email está registrado, recibirás un enlace de recuperación.' };
        }

        const resetToken = randomBytes(32).toString('hex');
        const hashedToken = createHash('sha256').update(resetToken).digest('hex');
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 1);

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = expirationDate;
        await this.usersService.save(user);

        const frontendUrl = await this.configurationService.get('FRONTEND_URL') || 'https://sucht.com.ar';
        const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

        await this.mailService.sendStyledMail(
            user.email,
            'Recuperación de Contraseña - SUCHT',
            'Recuperación de Contraseña',
            `<p>Recibimos una solicitud para restablecer tu contraseña.</p>
             <p>Haz clic en el botón de abajo para continuar:</p>
             <p style="font-size: 12px; margin-top: 20px; color: #666;">Si no solicitaste esto, puedes ignorar este correo. El enlace expirará en 1 hora.</p>`,
            { text: 'Restablecer mi Contraseña', url: resetUrl }
        );

        return { message: 'Si el email está registrado, recibirás un enlace de recuperación.' };
    }

    async resetPassword(token: string, newPassword: string): Promise<User> {
        const hashedToken = createHash('sha256').update(token).digest('hex');
        const user = await this.usersService.findUserByPasswordResetToken(hashedToken);

        if (!user) {
            throw new BadRequestException('El token no es válido o ha expirado.');
        }

        // ❌ CORRECCIÓN: Hashing the new password before saving it
        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;

        return this.usersService.save(user);
    }
}