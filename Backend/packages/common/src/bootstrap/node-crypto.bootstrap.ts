import * as nodeCrypto from 'node:crypto';

// in case legacy node js runtimes does not have crypto enabled. --> UUID will require crypto
export function ensureNodeCryptoGlobal(): void {
  if (typeof globalThis.crypto === 'undefined') {
    //global object of the current JavaScript runtime.
    Object.defineProperty(globalThis, 'crypto', {
      value: nodeCrypto,
      configurable: true,
    });
  }
}
