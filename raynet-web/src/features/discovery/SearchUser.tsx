import { useState } from 'react';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useDiscovery } from './index';

export default function SearchUser({ onSelect }: { onSelect(name: string): void }) {
  const { found, find } = useDiscovery();
  const [query, setQuery] = useState('');

  async function handleChange(value: string) {
    setQuery(value);
    if (value) await find(value);
  }

  return (
    <div className="space-y-2 relative">
      <Input
        placeholder="Find code e.g. AA-BB-CC-DD-EE-FF"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {found && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow">
          <div className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transform transition-transform duration-150 hover:-translate-y-0.5">
            <span className="flex flex-col">
              <span className="font-medium">{found}</span>
              <span className="text-xs font-mono text-gray-500">{query}</span>
            </span>
            <Button whileHover={{ scale: 1.05 }} onClick={() => onSelect(found)} className="px-2 py-1">Connect</Button>
          </div>
        </div>
      )}
    </div>
  );
}
