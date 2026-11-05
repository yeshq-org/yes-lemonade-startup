import { describe, expect, it } from 'vitest'
import { withTimeout } from './timeout'

describe('withTimeout', () => {
  it('resolves fast promises', async () => {
    await expect(withTimeout(Promise.resolve(5), 50)).resolves.toBe(5)
  })
  it('rejects hung promises', async () => {
    await expect(withTimeout(new Promise(() => {}), 20)).rejects.toThrow('timeout')
  })
})
