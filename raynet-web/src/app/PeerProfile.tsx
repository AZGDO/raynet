import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, User } from '../features/auth/store';
import Avatar from '../components/Avatar';
import Button from '../components/Button';

export default function PeerProfile({ username, open, onClose }: { username: string; open: boolean; onClose(): void }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (open) {
      db.users.get(username).then(u => setUser(u ?? null));
    }
  }, [open, username]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="bg-white dark:bg-gray-800 p-4 rounded w-full max-w-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Avatar username={user.username} />
                <div>
                  <div className="font-inter font-bold text-lg">{user.displayName || user.username}</div>
                  <div className="text-xs font-mono text-gray-500">{user.username}</div>
                </div>
              </div>
              <div className="italic text-sm">{user.status}</div>
              <div className="text-xs font-mono text-gray-500">Code: {user.code}</div>
            </div>
          ) : (
            <div>Unknown user</div>
          )}
          <div className="text-right mt-4">
            <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-3 py-1">Close</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
