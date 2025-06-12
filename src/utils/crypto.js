export async function generateEphemeralKey() {
  return crypto.subtle.generateKey({
    name: 'ECDH',
    namedCurve: 'X25519'
  }, true, ['deriveBits']);
}
