import { motion } from 'framer-motion';
import Avatar from './Avatar';

export default function ProfileCard({ username, displayName, status, onEdit }: { username: string; displayName: string; status: string; onEdit(): void }) {
  return (
    <div className="flex items-center space-x-3">
      <Avatar username={username} />
      <div className="flex-1">
        <div className="font-inter font-bold text-lg">{displayName}</div>
        <div className="italic text-sm text-gray-500 dark:text-gray-400">{status || "Hey there! I'm on Raynet."}</div>
      </div>
      <motion.button
        onClick={onEdit}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      >
        ✎
      </motion.button>
    </div>
  );
}
