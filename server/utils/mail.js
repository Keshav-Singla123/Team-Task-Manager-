import nodemailer from "nodemailer";

let devAccountPromise;

async function getTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  devAccountPromise ??= nodemailer.createTestAccount();
  const account = await devAccountPromise;
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: account.user, pass: account.pass }
  });
}

export async function sendMail({ to, subject, html }) {
  const transport = await getTransport();
  const info = await transport.sendMail({
    from: "TaskFlow <no-reply@taskflow.dev>",
    to,
    subject,
    html
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  // In development nodemailer may return a preview URL. We no longer
  // print it to the console to avoid leaking links during local runs.
  return info;
}
