import { motion } from 'framer-motion';
import Avatar from './Avatar';
import { db } from '../features/auth/store';

export default function ProfileCard({ username, displayName, status, code, onEdit }: { username: string; displayName: string; status: string; code: string; onEdit(): void }) {
  async function download() {
    const file = await db.rayfiles.get(username);
    if (!file) return;
    const blob = new Blob([file.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${username}.ray`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex items-center space-x-3">
      <Avatar username={username} />
      <div className="flex-1">
        <div className="font-inter font-bold text-lg">{displayName}</div>
        <div className="italic text-sm text-gray-500 dark:text-gray-400">{status || "Hey there! I'm on Raynet."}</div>
        <div className="text-xs font-mono text-gray-400 dark:text-gray-500">{code}</div>
      </div>
      <motion.button
        onClick={onEdit}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        ✎
      </motion.button>
      <motion.button
        onClick={download}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        ⬇
      </motion.button>
    </div>
  );
}
