jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/socket', () => ({
  disconnectAll: jest.fn(),
}));

import { useAuthStore } from '../authStore';

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  });
  jest.clearAllMocks();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;
});

describe('authStore', () => {
  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set auth data', () => {
    const user = {
      id: '1',
      phone: '09012345678',
      name: 'テスト',
      role: 'elderly' as const,
    };
    useAuthStore.getState().setAuth(user, 'access-token', 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('should logout and clear state', async () => {
    const user = {
      id: '1',
      phone: '09012345678',
      name: 'テスト',
      role: 'elderly' as const,
    };
    useAuthStore.getState().setAuth(user, 'token', 'refresh');

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should logout even when server request fails', async () => {
    const user = {
      id: '1',
      phone: '09012345678',
      name: 'テスト',
      role: 'elderly' as const,
    };
    useAuthStore.getState().setAuth(user, 'token', 'refresh');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
