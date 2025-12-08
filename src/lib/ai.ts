// Flexible AI client supporting multiple providers

interface AIProvider {
  baseUrl: string;
  headers: (key: string) => Record<string, string>;
}

const AI_PROVIDERS: Record<string, AIProvider> = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    headers: (key: string) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "LiveKit Video Chat",
    }),
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    headers: (key: string) => ({
      Authorization: `Bearer ${key}`,
    }),
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    headers: (key: string) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
  },
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const provider = process.env.AI_PROVIDER || "openrouter";
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "google/gemma-3-4b-it";

  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  const config = AI_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown AI provider: ${provider}. Supported: ${Object.keys(AI_PROVIDERS).join(", ")}`);
  }

  // Handle Anthropic differently (messages API)
  if (provider === "anthropic") {
    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const chatMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...config.headers(apiKey),
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemMessage,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // OpenAI-compatible API (OpenRouter, OpenAI)
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers(apiKey),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${provider} API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const AI_PROMPTS = {
  summarize: `You are a helpful meeting assistant. Summarize the following meeting transcript concisely in bullet points. Focus on:
- Key discussion points
- Decisions made
- Important information shared

Keep the summary clear and actionable.`,

  actionItems: `You are a helpful meeting assistant. Extract action items from the following meeting transcript. Format as a checklist with:
- The task to be done
- Who is responsible (if mentioned)
- Any deadline (if mentioned)

Only include clear, actionable items.`,

  keyPoints: `You are a helpful meeting assistant. Identify the key points and highlights from this meeting transcript. Include:
- Main topics discussed
- Notable quotes or statements
- Any concerns or issues raised

Be concise but thorough.`,
};
