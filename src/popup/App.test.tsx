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

  it('renders brain icon image', () => {
    render(<App />)
    const icon = screen.getByAltText('Bookmark Brain icon')
    expect(icon).toBeTruthy()
    expect(icon.getAttribute('src')).toContain('icon48.png')
  })

  it('has correct popup width class', () => {
    const { container } = render(<App />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('w-[380px]')
  })
})
