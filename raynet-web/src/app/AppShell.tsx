import { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './Landing';
import MainApp from './MainApp';
import { AuthProvider, useAuth } from '../features/auth';

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (!state.user) return <Navigate to="/" replace />;
  return children;
}

export default function AppShell() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<RequireAuth><MainApp /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
