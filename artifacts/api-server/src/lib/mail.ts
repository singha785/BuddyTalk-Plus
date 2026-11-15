import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!user || !pass) {
    throw new Error("Email is not configured: set SMTP_USER and SMTP_PASS in .env");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env["SMTP_HOST"] ?? "smtp.gmail.com",
      port: Number(process.env["SMTP_PORT"] ?? 465),
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "signup" | "reset",
  minutes: number,
) {
  const user = process.env["SMTP_USER"] ?? "";
  const from = process.env["SMTP_FROM"] ?? `BuddyTalk+ <${user}>`;
  const title = purpose === "signup" ? "Verify your email" : "Reset your password";
  const line =
    purpose === "signup"
      ? "Use this code to finish creating your BuddyTalk+ account."
      : "Use this code to reset your BuddyTalk+ password.";

  await getTransporter().sendMail({
    from,
    to,
    subject: `${code} is your BuddyTalk+ code`,
    text: `${title}\n\n${line}\n\nYour code: ${code}\n\nIt expires in ${minutes} minutes. If you did not request this, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="margin:0 0 8px">${title}</h2>
      <p style="color:#555">${line}</p>
      <div style="font-size:34px;letter-spacing:8px;font-weight:700;background:#F3F0FF;color:#3A1F9E;padding:16px;text-align:center;border-radius:12px">${code}</div>
      <p style="color:#777;font-size:13px">This code expires in ${minutes} minutes. If you did not request it, you can ignore this email.</p>
    </div>`,
  });
}
