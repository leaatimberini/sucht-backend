// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail', // Podés cambiar a smtp si usás otro proveedor
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendMail(to: string, subject: string, html: string, attachments?: any[]) {
    const mailOptions = {
      from: `"SUCHT Club" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo enviado:', info.response);
      return info;
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      throw error;
    }
  }
  async sendPartnerWelcome(data: { email: string; name: string }) {
    const subject = '¡Bienvenido a Partners de SUCHT!';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #ec4899; text-align: center;">¡Bienvenido a SUCHT Partners!</h2>
        <p>Hola <strong>${data.name}</strong>,</p>
        <p>Nos complace informarte que tu solicitud para unirte a nuestra red de partners ha sido <strong>APROBADA</strong>.</p>
        <p>A partir de ahora, tienes acceso al Panel de Control de Partners donde podrás:</p>
        <ul>
            <li>Gestionar tu perfil y apariencia.</li>
            <li>Crear y administrar cupones y beneficios exclusivos.</li>
            <li>Ver estadísticas de visualizaciones y canjes.</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://sucht.com.ar/dashboard/partner" style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ir a mi Dashboard</a>
        </div>
        <p>Si tienes alguna duda, no dudes en contactarnos.</p>
        <p>¡Gracias por confiar en nosotros!</p>
        <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">El equipo de SUCHT</p>
      </div>
    `;
    return this.sendMail(data.email, subject, html);
  }
}
