import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: className ? `ico ${className}` : "ico",
    "aria-hidden": true as const,
    ...rest,
  };
}

export function IconSwords(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4.5 19.5 14 10M9.5 4.5 19.5 14.5M8 4l2.5 1L9 8M16 16l1 2.5-2.5 1M5 15.5 3.5 18 6 19.5M18.5 5 20 7.5 17.5 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M16.5 19v-1.2a3.3 3.3 0 0 0-3.3-3.3H7.8A3.3 3.3 0 0 0 4.5 17.8V19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10.5" cy="8.2" r="2.7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.5 19v-1a2.8 2.8 0 0 0-2.1-2.7M15.2 5.6a2.6 2.6 0 0 1 0 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconDoor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M5.5 20.5V5.2A1.7 1.7 0 0 1 7.2 3.5h9.6A1.7 1.7 0 0 1 18.5 5.2v15.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5.5 20.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14.2" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8V4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.8" r="1" fill="currentColor" />
      <circle cx="9.2" cy="13" r="1.1" fill="currentColor" />
      <circle cx="14.8" cy="13" r="1.1" fill="currentColor" />
      <path d="M9.5 16.2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 19.2c.8-3.1 3.1-4.7 6.5-4.7s5.7 1.6 6.5 4.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLogin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M10 4.5H7.2A2.2 2.2 0 0 0 5 6.7v10.6A2.2 2.2 0 0 0 7.2 19.5H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M12.5 12H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 8.5 20.5 12 17 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M6.5 16.5h11l-1.1-1.3a2 2 0 0 1-.4-1.2V10a4 4 0 1 0-8 0v3.9a2 2 0 0 1-.4 1.2L6.5 16.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10.2 18.2a1.8 1.8 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.6v2.1M12 18.3v2.1M3.6 12h2.1M18.3 12h2.1M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCoin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.8v8.4M9.4 9.6c.6-.8 1.5-1.2 2.6-1.2 1.8 0 2.8 1 2.8 2.3S13.8 13 12 13s-2.8.8-2.8 2.2c0 1.3 1.1 2.2 2.9 2.2 1.1 0 2-.4 2.6-1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4.5h8v3.2a4 4 0 0 1-8 0V4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 6.2H5.8A2.2 2.2 0 0 0 5.8 10.5 3.5 3.5 0 0 0 8.8 12M16 6.2h2.2a2.2 2.2 0 0 1 0 4.3A3.5 3.5 0 0 1 15.2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 14.2h4L13.2 19.5h-2.4L10 14.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="m12 3.8 2.1 4.4 4.8.7-3.5 3.4.8 4.8L12 15.8 7.8 17.1l.8-4.8-3.5-3.4 4.8-.7L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 19.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16.5V11M12 16.5V7.5M17 16.5v-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M15.2 3.8A7.8 7.8 0 1 0 20.2 14 6.2 6.2 0 0 1 15.2 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m14.5 6-5 6 5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDiscord(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M8.2 7.5c1.3-.6 2.5-.8 3.8-.8s2.5.2 3.8.8M7.4 16.2c.9.5 1.9.8 3 .9h3.2c1.1-.1 2.1-.4 3-.9M9.3 14.2c-.6 0-1.1-.5-1.1-1.1S8.7 12 9.3 12s1.1.5 1.1 1.1-.5 1.1-1.1 1.1Zm5.4 0c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M16.8 19.2 18.4 16c1-.9 1.6-2.2 1.6-3.7 0-3.4-2.7-5.8-6-5.8h-4c-3.3 0-6 2.4-6 5.8 0 1.5.6 2.8 1.6 3.7l1.6 3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTelegram(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="m4.6 11.4 14.2-5.4c.7-.3 1.3.4 1 1.1L16 19.2c-.2.6-1 .7-1.4.3l-3.5-3.4-2.1 2c-.4.4-1.1.1-1.1-.4v-2.8L4.4 12.6c-.6-.3-.5-1.2.2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconInstagram(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.6" cy="7.4" r="1" fill="currentColor" />
    </svg>
  );
}

/** Circular gold lion seal logo */
export function LogoSeal({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className ? `logo-seal ${className}` : "logo-seal"}
      aria-hidden
    >
      <defs>
        <radialGradient id="sealGold" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f2d890" />
          <stop offset="45%" stopColor="#c9a24a" />
          <stop offset="100%" stopColor="#5a4318" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#sealGold)" stroke="#f0d78c" strokeWidth="2" />
      <circle cx="32" cy="32" r="24" fill="#1a140c" stroke="#d7b56a" strokeWidth="1.4" />
      {/* stylized lion head */}
      <path
        d="M22 28c1.5-6 5-10 10-10s8.5 4 10 10c2 1 4 3.5 4 6.5 0 5-4 9-14 9s-14-4-14-9c0-3 2-5.5 4-6.5Z"
        fill="#d7b56a"
      />
      <path d="M26 30.5c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Zm12 0c1.2 0 2 .8 2 2s-.8 2-2 2-2-.8-2-2 .8-2 2-2Z" fill="#1a140c" />
      <path d="M32 34.2c1.4 0 2.4.7 2.4 1.4 0 1.3-1.2 2.4-2.4 2.4s-2.4-1.1-2.4-2.4c0-.7 1-1.4 2.4-1.4Z" fill="#1a140c" />
      <path d="M27 24.5c-2-.8-3.5.2-4 1.5M37 24.5c2-.8 3.5.2 4 1.5" stroke="#f2d890" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M20 34c-2.5 1-4 3-3.5 4.5M44 34c2.5 1 4 3 3.5 4.5" stroke="#c9a24a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Realm animal emblems (image badges). */
export function RealmMark({
  realm,
  size = 22,
  className,
}: {
  realm: string;
  size?: number;
  className?: string;
}) {
  const src = `/emblems/${realm}.png`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className ? `realm-mark ${className}` : "realm-mark"}
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
}
