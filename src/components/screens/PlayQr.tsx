import { publicUrl } from '../../lib/publicUrl'
import { PLAY_QR_FILE, PLAY_URL } from '../../lib/playQr'

/** QR for the first screen. Small under the form on a phone, large beside it on a wide screen. */
export function PlayQr({ size }: { size: 'small' | 'large' }) {
  const dim = size === 'small' ? 'h-20 w-20' : 'h-64 w-64'
  return (
    <figure className="flex max-w-full flex-col items-center text-center" data-testid={size === 'small' ? 'play-qr-small' : 'play-qr-large'}>
      <img
        src={publicUrl(PLAY_QR_FILE)}
        alt="QR code that opens https://www.yeshq.org/lemonade"
        width={820}
        height={820}
        className={`${dim} max-w-full`}
      />
      <figcaption className="mt-2 max-w-full text-sm font-semibold">
        Scan to play on your phone
        <span className="mt-1 block font-normal break-all text-ink-soft">{PLAY_URL}</span>
      </figcaption>
    </figure>
  )
}
