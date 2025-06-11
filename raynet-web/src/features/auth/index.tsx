import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { db } from './store';
import { hashPassword } from '../../lib/crypto';

interface AuthState {
  user: string | null;
  guest: boolean;
}

type Action =
  | { type: 'login'; user: string; guest?: boolean }
  | { type: 'logout' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'login':
      return { user: action.user, guest: !!action.guest };
    case 'logout':
      return { user: null, guest: false };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  register(username: string, password: string): Promise<boolean>;
  login(username: string, password: string): Promise<boolean>;
  guest(username: string): void;
  logout(): void;
} | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext missing');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, guest: false });

  async function register(username: string, password: string) {
    const existing = await db.users.get(username);
    if (existing) return false;
    const hash = await hashPassword(password, username);
    await db.users.put({ username, passwordHash: hash });
    dispatch({ type: 'login', user: username });
    return true;
  }

  async function login(username: string, password: string) {
    const user = await db.users.get(username);
    if (!user) return false;
    const hash = await hashPassword(password, username);
    if (hash !== user.passwordHash) return false;
    dispatch({ type: 'login', user: username });
    return true;
  }

  function guest(username: string) {
    dispatch({ type: 'login', user: username, guest: true });
  }

  function logout() {
    dispatch({ type: 'logout' });
  }

  return (
    <AuthContext.Provider value={{ state, register, login, guest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
