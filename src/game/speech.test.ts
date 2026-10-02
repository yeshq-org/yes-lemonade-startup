import { describe, expect, it } from 'vitest'
import { appendTranscript, speechAvailable } from './speech'

describe('career speech', () => {
  it('appends a transcript after typed words and stays within 280 characters', () => {
    expect(appendTranscript('', '  I would buy less ice.  ')).toBe('I would buy less ice.')
    expect(appendTranscript('Price was the problem.', 'And the hours.')).toBe('Price was the problem. And the hours.')
    expect(appendTranscript('Already long', ' more', 12)).toBe('Already long')
  })

  it('hides talk when the browser has no speech engine', () => {
    expect(speechAvailable(null)).toBe(false)
    expect(speechAvailable({})).toBe(false)
    expect(speechAvailable({ SpeechRecognition: function SpeechRecognition() {} })).toBe(true)
    expect(speechAvailable({ webkitSpeechRecognition: function webkitSpeechRecognition() {} })).toBe(true)
  })
})
