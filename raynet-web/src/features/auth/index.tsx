import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { db } from './store';
import { generateCode } from '../../lib/code';
import { createRayFile, readRayFile } from '../../lib/rayfile';

interface AuthState {
  user: string | null;
  guest: boolean;
  displayName: string;
  status: string;
  code: string;
}

type Action =
  | { type: 'login'; user: string; guest?: boolean; displayName: string; status: string; code: string }
  | { type: 'logout' }
  | { type: 'update'; displayName: string; status: string };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'login':
      return { user: action.user, guest: !!action.guest, displayName: action.displayName, status: action.status, code: action.code };
    case 'update':
      return { ...state, displayName: action.displayName, status: action.status };
    case 'logout':
      return { user: null, guest: false, displayName: '', status: '', code: '' };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  register(username: string, password: string): Promise<boolean>;
  login(file: File, password: string): Promise<boolean>;
  guest(username: string): void;
  updateProfile(displayName: string, status: string): Promise<void>;
  logout(): void;
} | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext missing');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, guest: false, displayName: '', status: '', code: '' });

  async function register(username: string, password: string) {
    const existing = await db.users.get(username);
    if (existing) return false;
    const code = generateCode();
    await db.users.put({ username, displayName: username, status: "Hey there! I'm on Raynet.", code });
    const blob = await createRayFile(username, password, username, "Hey there! I'm on Raynet.", code);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}.ray`;
    a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'login', user: username, displayName: username, status: "Hey there! I'm on Raynet.", code });
    return true;
  }

  async function login(file: File, password: string) {
    const data = await readRayFile(await file.arrayBuffer(), password);
    if (!data) return false;
    const { username, displayName, status, code } = data;
    const existing = await db.users.get(username);
    if (!existing) await db.users.put({ username, displayName, status, code });
    dispatch({ type: 'login', user: username, displayName, status, code });
    return true;
  }

  function guest(username: string) {
    const code = generateCode();
    dispatch({ type: 'login', user: username, guest: true, displayName: username, status: "Hey there! I'm on Raynet.", code });
  }

  async function updateProfile(displayName: string, status: string) {
    if (!state.user) return;
    const user = await db.users.get(state.user);
    if (!user) return;
    await db.users.put({ ...user, displayName, status });
    dispatch({ type: 'update', displayName, status });
  }

  function logout() {
    dispatch({ type: 'logout' });
  }

  return (
    <AuthContext.Provider value={{ state, register, login, guest, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
