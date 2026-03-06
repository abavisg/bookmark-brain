import { render, screen } from '@testing-library/react'
import App from './App'

describe('Dashboard App', () => {
  it('renders header with "Bookmark Brain"', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /bookmark brain/i }),
    ).toBeTruthy()
  })

  it('renders sidebar with navigation items', () => {
    render(<App />)
    expect(screen.getByText('Library')).toBeTruthy()
    expect(screen.getByText('Search')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('renders main content area with welcome message', () => {
    render(<App />)
    expect(screen.getByText('Welcome to Bookmark Brain')).toBeTruthy()
  })
})
