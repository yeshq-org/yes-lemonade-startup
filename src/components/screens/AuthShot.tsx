import { PIN_WRONG } from '../../../supabase/functions/_shared/pinPolicy.ts'
import { LoginView } from './LoginScreen'
import { PinResetView, type PinResetCompetition, type PinResetMember } from './PinResetScreen'

const noop = () => {}

const competition: PinResetCompetition = { id: '00000000-0000-4000-8000-000000000099', name: 'Saturday Stands' }

const members: PinResetMember[] = [
  { id: '1', username: 'jordan_7', displayName: 'Jordan' },
  { id: '2', username: 'sam_k', displayName: 'Sam' },
]

export function AuthShot({ name }: { name: string }) {
  if (name === 'reset') {
    return (
      <PinResetView
        competitions={[competition]}
        requireCompetition
        competitionId={competition.id}
        members={members}
        username="jordan_7"
        pin=""
        pinAgain=""
        error={null}
        notice={null}
        busy={false}
        onCompetition={noop}
        onUsername={noop}
        onPin={noop}
        onPinAgain={noop}
        onSubmit={noop}
        onBack={noop}
        onSignOut={noop}
      />
    )
  }
  const mode = name === 'signin' || name === 'wrong' ? 'in' : name === 'email' ? 'email' : 'up'
  return (
    <LoginView
      mode={mode}
      name=""
      username={name === 'wrong' ? 'alex_p' : ''}
      pin=""
      pinAgain=""
      email=""
      password=""
      error={name === 'wrong' ? PIN_WRONG : null}
      notice={null}
      busy={false}
      onMode={noop}
      onName={noop}
      onUsername={noop}
      onPin={noop}
      onPinAgain={noop}
      onEmail={noop}
      onPassword={noop}
      onSubmit={noop}
    />
  )
}
