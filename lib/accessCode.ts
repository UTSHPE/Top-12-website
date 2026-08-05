import crypto from 'crypto'
import { CODE_ALPHABET as ALPHABET, CODE_LENGTH } from '@/lib/accessCodeFormat'

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
