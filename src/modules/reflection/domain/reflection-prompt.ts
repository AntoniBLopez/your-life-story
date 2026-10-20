import { formatReflectionHistory, reflectionHistoryForPrompt, type ReflectionMessage } from "./reflection-conversation";
import { reflectionInstructions } from "./reflection-policy";

export function buildReflectionPrompt(context: string, previousMessages: ReflectionMessage[]) {
  const conversation = formatReflectionHistory(reflectionHistoryForPrompt(previousMessages));
  return `${reflectionInstructions}\n\n${context}\n\nPREVIOUS CHAT:\n${conversation}`;
}
