import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="复制代码"
      className="rounded border border-white/10 px-2 py-1 text-xs text-neutral-400 transition hover:border-white/25 hover:text-white"
    >
      {copied ? '已复制' : '复制'}
    </button>
  );
}
