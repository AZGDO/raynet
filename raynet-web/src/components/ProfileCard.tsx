import Avatar from './Avatar';

export default function ProfileCard({ username }: { username: string }) {
  return (
    <div className="flex items-center space-x-3">
      <Avatar username={username} />
      <div>
        <div className="font-medium">{username}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">online</div>
      </div>
    </div>
  );
}
