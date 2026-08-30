import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import Home from '../routes/_index'

afterEach(cleanup)

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('homepage mobile navigation', () => {
  it('moves focus into the menu and exposes its relationship', async () => {
    const user = userEvent.setup()
    renderHome()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)

    const navigation = document.querySelector('#home-mobile-navigation') as HTMLElement
    expect(menuButton).toHaveAttribute('aria-controls', 'home-mobile-navigation')
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(within(navigation).getByRole('link', { name: 'Cafes' })).toHaveFocus())
  })

  it('contains tab navigation across the menu button and links', async () => {
    const user = userEvent.setup()
    renderHome()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)
    const navigation = document.querySelector('#home-mobile-navigation') as HTMLElement
    const menuLinks = within(navigation).getAllByRole('link')

    menuLinks.at(-1)?.focus()
    await user.tab()
    expect(menuButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(menuLinks.at(-1)).toHaveFocus()
  })

  it('closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    renderHome()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)
    await user.keyboard('{Escape}')

    expect(document.querySelector('#home-mobile-navigation')).not.toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton).toHaveFocus()
  })

  it('closes and restores focus when a link is activated', async () => {
    const user = userEvent.setup()
    renderHome()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)
    const navigation = document.querySelector('#home-mobile-navigation') as HTMLElement
    await user.click(within(navigation).getByRole('link', { name: 'About' }))

    expect(document.querySelector('#home-mobile-navigation')).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
  })
})
