import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('SuperSecret123!');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'SuperSecret123!')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false);
  });
});
