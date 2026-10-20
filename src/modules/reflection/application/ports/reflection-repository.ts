import type {
  ReflectionConversation,
  ReflectionMessage,
  ReflectionRole,
} from "../../domain/reflection-conversation";

export interface ReflectionRepository {
  hasAiConsent(userId: string): Promise<boolean>;
  listConversations(userId: string, limit: number): Promise<ReflectionConversation[]>;
  findConversation(userId: string, chatId: string): Promise<ReflectionConversation | null>;
  createConversation(userId: string, title: string): Promise<ReflectionConversation>;
  renameConversation(userId: string, chatId: string, title: string): Promise<ReflectionConversation | null>;
  replaceDerivedTitle(userId: string, chatId: string, title: string): Promise<string | null>;
  deleteConversation(userId: string, chatId: string): Promise<boolean>;
  listMessages(userId: string, chatId: string, limit: number): Promise<ReflectionMessage[]>;
  appendMessage(userId: string, chatId: string, role: ReflectionRole, content: string): Promise<boolean>;
}
