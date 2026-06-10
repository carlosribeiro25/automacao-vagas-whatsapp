import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
export async function sendResetEmail(email, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    try {
        await resend.emails.send({
            from: 'Suporte <noreply@wilsoncarlostech.uk>',
            to: email,
            subject: 'Recuperação de senha',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          
          <p>
            Recebemos uma solicitação para redefinir sua senha.
          </p>

          <p>
            Clique no botão abaixo para criar uma nova senha.
          </p>

          <a
            href="${resetLink}"
            style="
              display:inline-block;
              padding:12px 24px;
              background:#2563eb;
              color:#ffffff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
            "
          >
            Redefinir senha
          </a>

          <p style="margin-top:24px;">
            Este link expira em 15 minutos.
          </p>

          <p>
            Se você não solicitou esta alteração, ignore este e-mail.
          </p>
        </div>
      `,
            text: `


Recebemos uma solicitação para redefinir sua senha.

Acesse:
${resetLink}

Este link expira em 15 minutos.

Se você não solicitou esta alteração, ignore este e-mail.
      `,
        });
    }
    catch (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error);
        throw new Error('Não foi possível enviar o e-mail de recuperação');
    }
}
