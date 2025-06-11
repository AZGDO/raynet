import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './AuthModal';
import GuestPrompt from './GuestPrompt';
import Button from '../components/Button';
import { fade } from '../styles/animations';

export default function Landing() {
  const [modal, setModal] = useState<'login' | 'register' | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <h1 className="font-bold text-5xl font-recursive text-ray-violet">raynet</h1>
      <div className="space-x-4">
        <Button onClick={() => setModal('login')}>Register / Login</Button>
        <Button onClick={() => setGuestMode(true)} className="bg-photon-teal">Continue as Guest</Button>
      </div>
      <AnimatePresence>
        {modal && <AuthModal mode={modal} onClose={() => setModal(null)} />}
        {guestMode && (
          <motion.div {...fade} className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <motion.div className="bg-white dark:bg-gray-800 p-4 rounded" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} transition={{ duration: 0.18 }}>
              <GuestPrompt />
              <div className="mt-2 text-right">
                <Button onClick={() => setGuestMode(false)} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white">Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
