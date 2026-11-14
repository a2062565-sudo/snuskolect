import Link from "next/link";
import type { CSSProperties } from "react";

export function KapsMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="48" height="48" rx="14" fill="var(--ink)" />
      <circle cx="24" cy="24.5" r="12.5" fill="none" stroke="var(--bg)" strokeWidth="2.2" />
      <circle
        cx="24"
        cy="24.5"
        r="7.4"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="1.1"
        opacity="0.42"
      />
      <path d="M24 12V8.5" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M11.5 30.2c2.6 5 7 7.8 12.5 7.8s9.9-2.8 12.5-7.8"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="1.1"
        opacity="0.34"
        strokeLinecap="round"
      />
      <circle cx="32.2" cy="16.1" r="2.1" fill="var(--accent)" />
    </svg>
  );
}

export function KapsLogo({
  size = 36,
  wordmark = true,
  href = "/",
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  href?: string | null;
  className?: string;
}) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <KapsMark size={size} />
      {wordmark ? (
        <span
          className="font-display text-[21px] font-[680] leading-none tracking-[0.13em]"
          style={{ color: "var(--ink)" }}
        >
          KAPS
          <span style={{ color: "var(--accent)" }}>.</span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="KAPS — на главную" style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function BrandWordmark({ style }: { style?: CSSProperties }) {
  return (
    <span
      className="font-display text-[16px] font-[680] tracking-[0.12em]"
      style={style}
    >
      KAPS<span style={{ color: "var(--accent)" }}>.</span>
    </span>
  );
}
