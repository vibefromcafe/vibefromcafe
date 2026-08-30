import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { SiteHeader } from './SiteChrome'

afterEach(cleanup)

function renderHeader() {
  return render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>,
  )
}

describe('SiteHeader mobile navigation', () => {
  it('moves focus into the menu when it opens', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    const navigation = document.querySelector('#mobile-navigation') as HTMLElement
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(within(navigation).getByRole('link', { name: 'Cafes' })).toHaveFocus())
  })

  it('contains forward and backward tab navigation while open', async () => {
    const user = userEvent.setup()
    renderHeader()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)

    const navigation = document.querySelector('#mobile-navigation') as HTMLElement
    const menuLinks = within(navigation).getAllByRole('link')

    menuLinks.at(-1)?.focus()
    await user.tab()
    expect(menuButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(menuLinks.at(-1)).toHaveFocus()
  })

  it('closes on Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup()
    renderHeader()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('link', { name: 'Join community →' })).not.toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton).toHaveFocus()
  })

  it('closes and restores focus when a menu link is activated', async () => {
    const user = userEvent.setup()
    renderHeader()

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menuButton)
    const navigation = document.querySelector('#mobile-navigation') as HTMLElement
    await user.click(within(navigation).getByRole('link', { name: 'Cafes' }))

    expect(screen.queryByRole('link', { name: 'Join community →' })).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
  })
})
