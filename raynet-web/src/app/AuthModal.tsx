import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../features/auth';
import Input from '../components/Input';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { spring, fade } from '../styles/animations';

export default function AuthModal({ mode, onClose }: { mode: 'login' | 'register'; onClose(): void }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [username, setUsername] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = mode === 'login'
    ? file && password
    : username && password && password === confirm;

  async function submit() {
    if (!valid) return;
    setLoading(true);
    const ok = mode === 'login'
      ? await login(file!, password)
      : await register(username, password);
    setLoading(false);
    if (ok) { onClose(); navigate("/app"); }
    else setError('Invalid credentials');
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/40 flex items-end justify-center" {...fade}>
        <motion.div className="bg-white dark:bg-gray-800 w-full p-4 rounded-t-xl" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring}>
          <h2 className="text-xl mb-2 capitalize">{mode}</h2>
          <div className="space-y-2">
            {mode === 'register' ? (
              <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            ) : (
              <Input type="file" accept=".ray" onChange={e => setFile(e.target.files?.[0] || null)} />
            )}
            <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            {mode === 'register' && (
              <Input placeholder="Confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="mt-4 flex justify-end space-x-2">
            <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white">Cancel</Button>
            <Button onClick={submit} disabled={!valid || loading}>
              {loading ? <Spinner /> : 'Submit'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
