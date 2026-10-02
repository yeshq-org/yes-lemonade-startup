/** Join a file in `public/` to Vite's base, so GitHub Pages project URLs still find the logo. */
export function joinPublicPath(base: string, file: string): string {
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}${file.replace(/^\//, '')}`
}

export function publicUrl(file: string): string {
  return joinPublicPath(import.meta.env.BASE_URL, file)
}
