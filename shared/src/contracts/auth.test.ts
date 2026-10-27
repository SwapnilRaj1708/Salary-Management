import { describe, expect, it } from 'vitest';
import { LoginRequest } from './auth.ts';

describe('LoginRequest', () => {
  it('trims the email', () => {
    expect(LoginRequest.parse({ email: '  hr@acme.example ', password: 'x' }).email).toBe(
      'hr@acme.example',
    );
  });

  it('rejects unknown fields, as every request schema does', () => {
    expect(LoginRequest.safeParse({ email: 'a@b.c', password: 'x', admin: true }).success).toBe(
      false,
    );
  });

  it('rejects an empty password', () => {
    expect(LoginRequest.safeParse({ email: 'a@b.c', password: '' }).success).toBe(false);
  });
});
