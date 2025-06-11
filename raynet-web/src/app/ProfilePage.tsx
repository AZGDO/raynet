import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../features/auth';
import Input from '../components/Input';
import Button from '../components/Button';

export default function ProfilePage({ open, onClose }: { open: boolean; onClose(): void }) {
  const { state, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(state.displayName);
  const [status, setStatus] = useState(state.status);

  useEffect(() => {
    if (open) {
      setDisplayName(state.displayName);
      setStatus(state.status);
    }
  }, [open, state.displayName, state.status]);

  async function save() {
    await updateProfile(displayName, status);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 p-4 rounded w-full max-w-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="text-lg font-semibold mb-2">Profile Info</h2>
            <div className="space-y-2">
              <div className="text-sm">Username: {state.user}</div>
              <div className="text-xs font-mono text-gray-500">Code: {state.code}</div>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display Name" maxLength={30} />
              <textarea
                className="w-full rounded px-2 py-1 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-photon-teal transition-all duration-180 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                value={status}
                onChange={e => setStatus(e.target.value)}
                placeholder="Status message"
                maxLength={120}
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-3 py-1">Cancel</Button>
              <Button onClick={save} disabled={!displayName}>Save</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
