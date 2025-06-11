export default function Avatar({ username }: { username: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-photon-teal text-white flex items-center justify-center uppercase">
      {username[0]}
    </div>
  );
}
