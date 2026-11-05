import { describe, expect, it } from 'vitest'
import { joinPublicPath } from './publicUrl'

describe('public paths', () => {
  it('keeps a local root and prefixes the Pages project path', () => {
    expect(joinPublicPath('/', 'brand/logo.png')).toBe('/brand/logo.png')
    expect(joinPublicPath('/yes-lemonade-startup/', '/brand/logo.png')).toBe('/yes-lemonade-startup/brand/logo.png')
  })
})
