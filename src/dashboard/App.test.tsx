import { render, screen } from '@testing-library/react'
import App from './App'

describe('Dashboard App', () => {
  it('renders header with "Bookmark Brain"', () => {
    render(<App />)
    const headings = screen.getAllByRole('heading', { name: /bookmark brain/i })
    expect(headings.length).toBeGreaterThanOrEqual(1)
    expect(headings[0].tagName).toBe('H1')
    expect(headings[0].textContent).toBe('Bookmark Brain')
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

  it('renders header with brain icon', () => {
    render(<App />)
    const icons = screen.getAllByAltText('Bookmark Brain icon')
    expect(icons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders subtitle text', () => {
    render(<App />)
    expect(screen.getByText('Your AI-powered bookmark library')).toBeTruthy()
  })

  it('renders version number', () => {
    render(<App />)
    expect(screen.getByText('v0.1.0')).toBeTruthy()
  })
})
