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

  async sendStyledMail(to: string, subject: string, title: string, contentHtml: string, action?: { text: string; url: string }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Arial', sans-serif;">
  <div style="background-color: #121212; padding: 40px 10px;">
    <div style="max-width: 500px; margin: auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #333333; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);">
      
      <!-- HEADER -->
      <div style="padding: 30px; background-color: #000000; text-align: center; border-bottom: 1px solid #222;">
        <h1 style="color: #ffffff; font-size: 32px; margin: 0; letter-spacing: 2px;">SUCHT</h1>
      </div>

      <div style="padding: 40px 30px;">
        <!-- TITLE -->
        <h2 style="color: #ffffff; font-size: 24px; margin-top: 0; text-align: center; font-weight: 700;">${title}</h2>
        
        <!-- CONTENT -->
        <div style="color: #bbbbbb; font-size: 16px; text-align: center; margin-bottom: 30px; line-height: 1.6;">
            ${contentHtml}
        </div>
        
        <!-- ACTION BUTTON -->
        ${action ? `
        <div style="text-align: center; margin-top: 30px;">
          <a href="${action.url}" target="_blank" style="display: inline-block; background-color: #D6006D; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 14px; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(214, 0, 109, 0.4); text-transform: uppercase;">
            ${action.text}
          </a>
        </div>
        ` : ''}

      </div>

      <!-- FOOTER -->
      <div style="padding: 30px; text-align: center; border-top: 1px solid #222; background-color: #000000;">
        <p style="margin: 0; color: #555555; font-size: 12px; line-height: 1.6;">
          Gracias por elegir SUCHT.<br>
          Este es un correo generado automáticamente, por favor no respondas.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    return this.sendMail(to, subject, html);
  }
}
