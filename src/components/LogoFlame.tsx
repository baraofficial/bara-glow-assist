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
        <linearGradient id="flameCore" x1="32" y1="26" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#E9D5FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Outer flame — teardrop with curled base */}
      <path
        d="M34 3
           C 33 14, 44 20, 46 32
           C 48 44, 42 58, 32 60
           C 22 60, 14 52, 14 41
           C 14 33, 20 30, 22 22
           C 24 28, 28 28, 28 22
           C 30 26, 32 26, 34 3 Z"
        fill="url(#flameGrad)"
        stroke="#A855F7"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Inner glow flame */}
      <path
        d="M33 22
           C 33 30, 40 34, 40 44
           C 40 52, 36 56, 32 56
           C 28 56, 24 52, 24 44
           C 24 38, 30 36, 30 30 Z"
        fill="url(#flameCore)"
      />
    </svg>
  );
}

export default LogoFlame;
