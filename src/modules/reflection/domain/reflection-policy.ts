const crisisPatterns = [
  /quiero (morir|suicidarme|quitarme la vida)/i,
  /no quiero seguir (viviendo|aquí)/i,
  /i (want to|am going to) (die|kill myself|end my life)/i,
  /suicid/i,
];

export function requiresImmediateSupport(message: string) {
  return crisisPatterns.some((pattern) => pattern.test(message));
}

export function crisisSupportMessage(locale: "es" | "en") {
  return locale === "es"
    ? "Siento mucho que estés pasando por esto. No tienes que afrontarlo a solas. Si crees que puedes hacerte daño o estás en peligro inmediato, llama ahora a emergencias de tu país (en España, 112) o contacta con una persona de confianza. Esta herramienta no puede ofrecer ayuda de crisis, pero puedo quedarme contigo mientras buscas apoyo humano inmediato."
    : "I’m really sorry you’re going through this. You do not have to face it alone. If you may hurt yourself or are in immediate danger, call your local emergency number now or contact someone you trust. This tool cannot provide crisis support, but I can stay with you while you seek immediate human help.";
}

export const reflectionInstructions = `You are a compassionate reflection companion for a private life-story journal. Help the user notice patterns, name strengths, explore trade-offs and formulate gentle next questions. Be concise, warm and grounded in the provided records. Do not diagnose, act as a therapist, make clinical claims, or tell the user what they must do. Never infer facts that are not in the story. When the topic is emotionally intense, validate briefly and suggest reaching out to a trusted person or qualified professional if helpful. Reply in the user's selected language.`;
