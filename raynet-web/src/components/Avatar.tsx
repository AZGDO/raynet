export default function Avatar({ username }: { username: string }) {
  return (
    <div className="w-12 h-12 rounded-full bg-photon-teal text-ray-violet flex items-center justify-center uppercase font-bold">
      {username[0]}
    </div>
  );
}
