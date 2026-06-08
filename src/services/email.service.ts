import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendResetEmail(email: string, token: string) {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: 'noreply@wilsoncarlostech.uk',
    to: email,
    subject: 'Recuperação de senha',
    html: `<p>Clique no link para recuperar sua senha.Token válido por 15 minutos.</p>
        <a href="${link}"> ${link} </a>`,
  })
}
