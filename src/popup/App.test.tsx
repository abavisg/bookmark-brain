import { render, screen } from '@testing-library/react'
import App from './App'

describe('Popup App', () => {
  it('renders "Bookmark Brain" heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /bookmark brain/i }),
    ).toBeTruthy()
  })

  it('renders "Bookmark Brain is ready" text', () => {
    render(<App />)
    expect(screen.getByText('Bookmark Brain is ready')).toBeTruthy()
  })
})
