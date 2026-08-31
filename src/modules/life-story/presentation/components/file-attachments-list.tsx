"use client";

import { FileText, Image as ImageIcon } from "lucide-react";
import type { AttachmentRecord } from "@/shared/lib/mongodb/attachments";
import { AUDIO_CONTENT_TYPES } from "@/modules/life-story/domain/voice-note";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  locale: "es" | "en";
  attachments: AttachmentRecord[];
};

export function FileAttachmentsList({ locale, attachments }: Props) {
  const files = attachments.filter((item) => !AUDIO_CONTENT_TYPES.includes(item.mimeType as (typeof AUDIO_CONTENT_TYPES)[number]));
  if (files.length === 0) return null;

  const heading = locale === "es" ? "Archivos adjuntos" : "Attached files";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--ink)]">{heading}</h3>
      <ul className="space-y-2">
        {files.map((file) => {
          const isPdf = file.mimeType === "application/pdf";
          const Icon = isPdf ? FileText : ImageIcon;
          return (
            <li key={file.id}>
              <a
                href={`/api/attachments/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[#fcfdf9] p-3 transition hover:border-[var(--moss)]"
              >
                <span className="rounded-lg bg-[#edf3eb] p-2 text-[var(--moss-deep)]">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--ink)]">{file.fileName}</span>
                  <span className="text-xs text-[var(--muted)]">{formatSize(file.sizeBytes)}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
