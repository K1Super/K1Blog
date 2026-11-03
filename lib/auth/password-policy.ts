export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE = '密码至少 8 位，且需同时包含大写字母、小写字母和数字';

export function meetsPasswordPolicy(password: string) {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}
