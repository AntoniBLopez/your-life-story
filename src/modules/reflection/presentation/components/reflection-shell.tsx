"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReflectionConversation } from "../../domain/reflection-conversation";

type ReflectionShell = {
  conversations: ReflectionConversation[];
  upsertConversation: (conversation: ReflectionConversation) => void;
  removeConversation: (chatId: string) => void;
  touchConversation: (chatId: string) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  desktopOpen: boolean;
  mobileOpen: boolean;
};

const ReflectionShellContext = createContext<ReflectionShell | null>(null);

export function useReflectionShell() {
  const value = useContext(ReflectionShellContext);
  if (!value) throw new Error("Reflection shell is unavailable.");
  return value;
}

function byRecent(conversations: ReflectionConversation[]) {
  return [...conversations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
}

export function ReflectionShellProvider({
  initialConversations,
  desktopOpen,
  mobileOpen,
  onOpenSidebar,
  onCloseSidebar,
  children,
}: {
  initialConversations: ReflectionConversation[];
  desktopOpen: boolean;
  mobileOpen: boolean;
  onOpenSidebar: () => void;
  onCloseSidebar: () => void;
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [baseline, setBaseline] = useState(initialConversations);
  if (baseline !== initialConversations) {
    setBaseline(initialConversations);
    setConversations(initialConversations);
  }

  const value = useMemo<ReflectionShell>(() => ({
    conversations,
    desktopOpen,
    mobileOpen,
    openSidebar: onOpenSidebar,
    closeSidebar: onCloseSidebar,
    upsertConversation(conversation) {
      setConversations((current) => byRecent([conversation, ...current.filter((item) => item.id !== conversation.id)]));
    },
    removeConversation(chatId) {
      setConversations((current) => current.filter((item) => item.id !== chatId));
    },
    touchConversation(chatId) {
      const updatedAt = new Date().toISOString();
      setConversations((current) => byRecent(current.map((item) => item.id === chatId ? { ...item, updatedAt } : item)));
    },
  }), [conversations, desktopOpen, mobileOpen, onOpenSidebar, onCloseSidebar]);

  return <ReflectionShellContext.Provider value={value}>{children}</ReflectionShellContext.Provider>;
}
