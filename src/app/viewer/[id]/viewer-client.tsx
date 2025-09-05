"use client";
import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";

interface Props {
  docId: string;
  title: string;
}

export default function ViewerClient({ docId, title }: Props) {
  const [text, setText] = useState<string>("");
  const [fileB64, setFileB64] = useState<string>("");
  const [mime, setMime] = useState<string>("");

  useEffect(() => {
    try {
      const textKey = `kbai:doc:${docId}:text`;
      const fileKey = `kbai:doc:${docId}:file`;
      const mimeKey = `kbai:doc:${docId}:mime`;
      setText(localStorage.getItem(textKey) || "");
      setFileB64(localStorage.getItem(fileKey) || "");
      setMime(localStorage.getItem(mimeKey) || "");
    } catch {}
  }, [docId]);

  const hasText = useMemo(() => text && text.trim().length > 0, [text]);

  return (
    <div>
      <div className="grid lg:grid-cols-3 gap-4">
        <input
          type="hidden"
          value={fileB64 ? `hasfile:${mime}` : ""}
          readOnly
        />
      </div>
      <div className="w-full h-[30rem]">
        <ChatPanel
          contextTitle={hasText ? `${title}\n\n${text.slice(0, 8000)}` : title}
          fileBase64={fileB64}
          fileMime={mime}
        />
      </div>
    </div>
  );
}
