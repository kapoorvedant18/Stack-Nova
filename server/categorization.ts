export interface CategorizationInput {
  title: string;
  description?: string;
  source: string;
}

export interface CategorizationResult {
  category: string;
  tags: string[];
  priority: "low" | "medium" | "high";
}

const DEFAULT_CATEGORIES = ["Work", "Study", "Personal", "Meetings", "Projects", "Today", "Upcoming"];

function heuristicCategorize(text: string): CategorizationResult {
  const normalized = text.toLowerCase();

  const keywordRules: Array<{ category: string; tags: string[]; words: string[]; priority?: "low" | "medium" | "high" }> = [
    { category: "Meetings", tags: ["meeting", "calendar"], words: ["meeting", "sync", "standup", "call", "agenda"], priority: "high" },
    { category: "Study", tags: ["study", "learning"], words: ["assignment", "exam", "lecture", "course", "university"], priority: "high" },
    { category: "Work", tags: ["work", "office"], words: ["client", "invoice", "proposal", "deadline", "review"] },
    { category: "Projects", tags: ["project"], words: ["project", "milestone", "feature", "sprint"] },
    { category: "Upcoming", tags: ["upcoming"], words: ["tomorrow", "next week", "soon", "upcoming"] },
    { category: "Today", tags: ["today"], words: ["today", "urgent", "asap"], priority: "high" },
  ];

  for (const rule of keywordRules) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return {
        category: rule.category,
        tags: rule.tags,
        priority: rule.priority ?? "medium",
      };
    }
  }

  return {
    category: "Personal",
    tags: ["personal"],
    priority: "medium",
  };
}

async function groqCategorize(prompt: string): Promise<CategorizationResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You categorize productivity items. Return strict JSON with keys: category (one of Work, Study, Personal, Meetings, Projects, Today, Upcoming), tags (string array max 5), priority (low|medium|high).",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<CategorizationResult>;
    const category = DEFAULT_CATEGORIES.includes(String(parsed.category)) ? String(parsed.category) : "Personal";
    const priority = parsed.priority === "low" || parsed.priority === "high" ? parsed.priority : "medium";
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((tag) => typeof tag === "string").slice(0, 5)
      : [];

    return {
      category,
      tags,
      priority,
    };
  } catch {
    return null;
  }
}

export async function categorizeItem(input: CategorizationInput): Promise<CategorizationResult> {
  const mergedText = `${input.title}\n${input.description ?? ""}`.trim();
  const prompt = `Source: ${input.source}\nText: ${mergedText}`;

  const groqResult = await groqCategorize(prompt);
  if (groqResult) return groqResult;

  return heuristicCategorize(prompt);
}
