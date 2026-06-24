import crypto from 'crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ23469'
const CODE_LENGTH = 6

export function generateAccessCode(): string {
  const alphabetLen = ALPHABET.length
  const maxUnbiased = Math.floor(256 / alphabetLen) * alphabetLen
  let code = ''
  while (code.length < CODE_LENGTH) {
    const bytes = crypto.randomBytes(CODE_LENGTH * 2)
    for (let i = 0; i < bytes.length && code.length < CODE_LENGTH; i++) {
      const byte = bytes[i]
      if (byte < maxUnbiased) code += ALPHABET[byte % alphabetLen]
    }
  }
  return code
}
