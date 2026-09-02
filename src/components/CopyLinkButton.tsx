'use client';

import { useEffect, useState } from 'react';

/** Copies a share URL to the clipboard; falls back to selecting nothing but showing the URL in the title. */
export default function CopyLinkButton({ url, label = 'Copy share link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  return (
    <button type="button" className="btn btn-ghost" onClick={copy} title={url}>
      {copied ? 'Link copied' : label}
    </button>
  );
}
