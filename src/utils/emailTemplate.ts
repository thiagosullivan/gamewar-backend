import { sendEmail } from "../lib/sendEmail.js";

// Templates de email pré-definidos
export const emailTemplates = {
  // Template de boas-vindas
  welcome: (name: string, verificationLink?: string) => {
    return {
      subject: `🎉 Bem-vindo(a) à nossa loja, ${name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; padding: 15px 40px; color: #ffffff">
          <h1 style="color: #ff7a21;">Seja muito bem-vindo(a), ${name}!</h1>
          <p>Estamos muito felizes em tê-lo(a) conosco em nossa loja virtual.</p>
          
          ${
            verificationLink
              ? `
          <p>Para ativar sua conta, clique no link abaixo:</p>
          <a href="${verificationLink}" 
             style="background-color: #ff7a21; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar minha conta
          </a>
          `
              : ""
          }
          
          <p style="margin-top: 30px;">Aproveite nossas ofertas exclusivas!</p>
          
          <hr style="border: 1px solid #ff7a21; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666;">
            Se você não criou esta conta, por favor ignore este email.
          </p>
</div>
      `,
      text: `Bem-vindo(a) ${name}! Estamos felizes em tê-lo(a) conosco.${verificationLink ? `\n\nPara ativar sua conta, acesse: ${verificationLink}` : ""}`,
    };
  },

  // Template de recuperação de senha
  passwordReset: (
    name: string,
    resetLink: string,
    expiresIn: string = "24 horas",
  ) => {
    return {
      subject: "🔒 Redefinição de senha",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; padding: 15px 40px; color: #ffffff"">
          <h1 style="color: #ff7a21;">Redefinir sua senha</h1>
          <p>Olá, ${name}!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <a href="${resetLink}" 
             style="background-color: #ff7a21; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Redefinir senha
          </a>
          
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Este link expira em ${expiresIn}. Se você não solicitou esta redefinição, 
            por favor ignore este email.
          </p>
          
          <p style="margin-top: 30px;">
            Atenciosamente,<br>
            Equipe da Loja
          </p>
        </div>
      `,
      text: `Olá ${name},\n\nPara redefinir sua senha, acesse: ${resetLink}\n\nEste link expira em ${expiresIn}.`,
    };
  },

  // Template de pedido confirmado
  orderConfirmation: (
    name: string,
    orderNumber: string,
    orderDetails: string,
  ) => {
    return {
      subject: `✅ Pedido #${orderNumber} confirmado!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; padding: 15px 40px; color: #ffffff">
          <h1 style="color: #28a745;">Pedido confirmado!</h1>
          <p>Olá, ${name},</p>
          <p>Seu pedido <strong>#${orderNumber}</strong> foi confirmado com sucesso!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; color: #ff7a21;">
            ${orderDetails}
          </div>
          
          <p>Acompanhe seu pedido através do nosso site.</p>
          
          <p style="margin-top: 30px;">
            Obrigado pela sua compra!<br>
            Equipe da Loja
          </p>
        </div>
      `,
      text: `Pedido #${orderNumber} confirmado!\n\nOlá ${name},\n\nSeu pedido foi confirmado com sucesso!\n\nDetalhes do pedido:\n${orderDetails}\n\nAcompanhe seu pedido através do nosso site.`,
    };
  },
};

// Função auxiliar para enviar email de boas-vindas
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  verificationLink?: string,
) => {
  const template = emailTemplates.welcome(name, verificationLink);

  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Função auxiliar para enviar email de recuperação de senha
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetLink: string,
) => {
  const template = emailTemplates.passwordReset(name, resetLink);

  return await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};
