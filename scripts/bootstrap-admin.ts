import { env } from '../lib/env';
import { auth } from '../lib/auth/auth-core';
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from '../lib/auth/password-policy';
import { rawDb } from '../lib/db/client-core';

type ExistingUser = { id: string; username: string | null };

async function main() {
  const username = env.ADMIN_USERNAME;
  const password = env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME 与 ADMIN_PASSWORD 未设置，无法初始化管理员');
  }
  if (!meetsPasswordPolicy(password)) {
    throw new Error(PASSWORD_POLICY_MESSAGE);
  }

  const normalizedUsername = username.toLowerCase();
  const email = env.ADMIN_EMAIL ?? `${normalizedUsername}@k1.local`;

  const findUser = (field: 'email' | 'username', value: string) =>
    rawDb.prepare(`select id, username from user where ${field} = ?`).get(value) as
      ExistingUser | undefined;

  const existing = findUser('email', email) ?? findUser('username', normalizedUsername);

  if (existing) {
    if (existing.username === normalizedUsername) {
      console.log(`admin already exists: ${username}`);
      return;
    }
    if (existing.username) {
      throw new Error(`账户 ${existing.username} 已存在，无法绑定 ${username}`);
    }
    rawDb
      .prepare('update user set username = ?, updated_at = ? where id = ?')
      .run(normalizedUsername, Date.now(), existing.id);
    console.log(`admin username assigned: ${username}`);
    return;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: '管理员',
        username: normalizedUsername,
      },
      headers: new Headers({
        host: new URL(env.SITE_URL).host,
        origin: env.SITE_URL,
      }),
    });
    console.log(`admin bootstrap ok: ${username}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('exists') || message.toLowerCase().includes('already')) {
      console.log(`admin already exists: ${username}`);
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    rawDb.close();
  });
