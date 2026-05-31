import * as nodeCrypto from 'node:crypto';

export function ensureNodeCryptoGlobal(): void {
  if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
      value: nodeCrypto,
      configurable: true,
    });
  }
}
