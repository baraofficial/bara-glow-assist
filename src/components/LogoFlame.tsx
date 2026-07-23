import sharingan from "@/assets/sharingan.png.asset.json";

interface LogoFlameProps {
  size?: number;
  className?: string;
}

export function LogoFlame({ size = 32, className = "" }: LogoFlameProps) {
  return (
    <img
      src={sharingan.url}
      width={size}
      height={size}
      alt="BARA AI"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default LogoFlame;
