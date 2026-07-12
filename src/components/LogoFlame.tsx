import type { SVGProps } from "react";

interface LogoFlameProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function LogoFlame({ size = 32, className = "", ...props }: LogoFlameProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo-glow drop-shadow-[0_0_15px_#A855F7] ${className}`}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="flameGrad" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0ABFC" />
          <stop offset="45%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>
        <linearGradient id="flameCore" x1="32" y1="24" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#D8B4FE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Outer flame — sharp, tech shape */}
      <path
        d="M32 3 L44 22 L38 24 L52 40 L44 42 L54 60 L32 52 L10 60 L20 42 L12 40 L26 24 L20 22 Z"
        fill="url(#flameGrad)"
        stroke="#A855F7"
        strokeWidth="1"
        strokeLinejoin="miter"
      />
      {/* Inner glow core */}
      <path
        d="M32 20 L38 34 L34 36 L42 50 L32 46 L22 50 L30 36 L26 34 Z"
        fill="url(#flameCore)"
      />
    </svg>
  );
}

export default LogoFlame;
