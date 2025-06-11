import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../features/auth';

export default function GuestPrompt() {
  const { guest } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  return (
    <div className="space-y-2">
      <Input placeholder="Nickname" value={name} onChange={e => setName(e.target.value)} />
      <Button onClick={() => { guest(name); navigate("/app"); }} disabled={!name}>Continue</Button>
    </div>
  );
}
