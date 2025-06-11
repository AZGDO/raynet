import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { db } from './store';
import { generateCode } from '../../lib/code';
import { createRayFile, readRayFile } from '../../lib/rayfile';
import { setCookie, getCookie, deleteCookie } from '../../lib/cookies';

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

  useEffect(() => {
    const saved = getCookie('raynetCred');
    if (!saved) return;
    (async () => {
      try {
        const { username, password } = JSON.parse(atob(saved));
        const file = await db.rayfiles.get(username);
        if (file) {
          const data = await readRayFile(file.data, password);
          if (data) {
            dispatch({ type: 'login', user: data.username, displayName: data.displayName, status: data.status, code: data.code });
          }
        }
      } catch {
        deleteCookie('raynetCred');
      }
    })();
  }, []);

  async function register(username: string, password: string) {
    const existing = await db.users.get(username);
    if (existing) return false;
    const code = generateCode();
    await db.users.put({ username, displayName: username, status: "Hey there! I'm on Raynet.", code });
    const blob = await createRayFile(username, password, username, "Hey there! I'm on Raynet.", code);
    await db.rayfiles.put({ username, data: await blob.arrayBuffer() });
    setCookie('raynetCred', btoa(JSON.stringify({ username, password })));
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
    const buf = await file.arrayBuffer();
    const data = await readRayFile(buf, password);
    if (!data) return false;
    const { username, displayName, status, code } = data;
    const existing = await db.users.get(username);
    if (!existing) await db.users.put({ username, displayName, status, code });
    await db.rayfiles.put({ username, data: buf });
    setCookie('raynetCred', btoa(JSON.stringify({ username, password })));
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
    deleteCookie('raynetCred');
  }

  return (
    <AuthContext.Provider value={{ state, register, login, guest, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
