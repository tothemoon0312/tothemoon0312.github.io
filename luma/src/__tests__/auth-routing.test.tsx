import { renderRouter, screen } from 'expo-router/testing-library';

import { DISCLAIMER } from '@/components/disclaimer';

const mockGetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signOut: jest.fn(),
    },
  },
}));

const fakeSession = { user: { id: 'user-1', email: 'test@school.edu' } };

describe('auth routing', () => {
  beforeEach(() => mockGetSession.mockReset());

  it('shows the welcome screen with the disclaimer when signed out', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(await screen.findByText('Tell me about you and your money.')).toBeOnTheScreen();
    expect(screen.getByText(DISCLAIMER)).toBeOnTheScreen();
  });

  it('shows the feed when signed in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(await screen.findByText("Let's get to know you first")).toBeOnTheScreen();
  });

  it('keeps signed-out users out of the tabs', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await renderRouter('./src/app', { initialUrl: '/profile' });

    expect(await screen.findByText('Tell me about you and your money.')).toBeOnTheScreen();
    expect(screen.queryByText('Sign out')).toBeNull();
  });
});
