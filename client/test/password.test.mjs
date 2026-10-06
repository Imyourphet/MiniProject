import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePassword } from '../src/lib/password.mjs';

test('generated passwords fit the account form and include all character groups', () => {
  const passwords = Array.from({ length: 100 }, () => generatePassword());
  for (const password of passwords) {
    assert.match(password, /^[A-Za-z0-9!@]{6}$/);
    for (const group of [/[A-Z]/, /[a-z]/, /\d/, /[!@]/]) assert.match(password, group);
  }
  assert.equal(new Set(passwords).size, passwords.length);
});
