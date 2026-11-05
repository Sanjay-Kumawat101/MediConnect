export function isConfiguredAdmin(email) {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(adminEmail => adminEmail.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}
