import { useEffect, useState } from "react";

export function CountdownTimer({ target }: { target: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const Item = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center bg-card/50 backdrop-blur rounded-lg p-3 sm:p-4 min-w-[64px] sm:min-w-[80px] border border-border">
      <span className="text-2xl sm:text-4xl font-bold text-primary tabular-nums">{String(v).padStart(2,"0")}</span>
      <span className="text-[10px] sm:text-xs uppercase text-muted-foreground mt-1">{l}</span>
    </div>
  );
  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      <Item v={days} l="dias" />
      <Item v={hours} l="hrs" />
      <Item v={minutes} l="min" />
      <Item v={seconds} l="seg" />
    </div>
  );
}
