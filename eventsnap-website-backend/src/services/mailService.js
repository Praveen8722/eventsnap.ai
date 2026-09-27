// Notification dispatcher for the marketing site.
//
// No third-party email provider is wired up in this project, so this logs
// the outgoing message and returns a delivery result. To go live, replace
// the console.log call with a real provider call (e.g. nodemailer) — the
// shape of the return value can stay the same.

export const notifyNewContactMessage = async ({
  name,
  email,
  subject,
  message,
}) => {
  console.log(
    `[contact:notify] New message from ${name} <${email}> — ${subject}\n${message}`
  );
  return { delivered: true };
};
