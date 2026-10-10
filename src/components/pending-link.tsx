"use client";
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function PendingHint() {
  const { pending } = useLinkStatus();
  return <span role="status" style={{ display: 'inline-block', minWidth: '1rem', fontSize: '.75rem' }}>{pending ? '…' : ''}<span className="sr-only">{pending ? 'Loading page' : ''}</span></span>;
}
export default function PendingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<PendingHint /></Link>;
}
