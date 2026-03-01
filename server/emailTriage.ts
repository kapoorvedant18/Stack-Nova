import { categorizeItem } from "./categorization";

export interface EmailTriageInput {
  subject: string;
  bodySummary: string;
  sender?: string;
  provider: "gmail" | "outlook";
}

export interface EmailTriageResult {
  keep: boolean;
  reason: string;
  category: string;
  tags: string[];
  priority: "low" | "medium" | "high";
  important: boolean;
}

interface KeywordRule {
  pattern: RegExp;
  tag: string;
  category?: string;
  priority?: "low" | "medium" | "high";
}

const USELESS_KEYWORDS = [
  "newsletter",
  "unsubscribe",
  "sale",
  "offer",
  "coupon",
  "promo",
  "promotion",
  "deal",
  "black friday",
  "new arrivals",
  "marketing",
  "sponsored",
];

const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /\blinkedin\b/i, tag: "linkedin", category: "Work" },
  { pattern: /\bgsoc\b|google\s*summer\s*of\s*code/i, tag: "gsoc", category: "Study", priority: "high" },
  { pattern: /\bzulip\b/i, tag: "zulip", category: "Projects" },
  { pattern: /\bgithub\b/i, tag: "github", category: "Projects" },
  { pattern: /\binternship\b|\bfull[-\s]?time\b|\bjob\b|\breferral\b/i, tag: "career", category: "Work", priority: "high" },
  { pattern: /\binterview\b|\bassessment\b|\bonline\s*test\b/i, tag: "interview", category: "Work", priority: "high" },
  { pattern: /\bdeadline\b|\bdue\b|\bsubmission\b|\burgent\b|\basap\b/i, tag: "deadline", category: "Today", priority: "high" },
  { pattern: /\bhackathon\b|\bopen\s*source\b/i, tag: "opensource", category: "Projects" },
  { pattern: /\binvoice\b|\bpayment\b|\breceipt\b/i, tag: "finance", category: "Work" },
  { pattern: /\bmeeting\b|\bcalendar\b|\binvite\b/i, tag: "meeting", category: "Meetings" },
];

function mergeTags(...groups: string[][]): string[] {
  const merged = groups.flat().map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(merged));
}

function priorityRank(priority: "low" | "medium" | "high"): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function keywordSignals(subject: string, bodySummary: string): {
  tags: string[];
  category?: string;
  priority?: "low" | "medium" | "high";
} {
  const text = `${subject}\n${bodySummary}`;
  const matched = KEYWORD_RULES.filter((rule) => rule.pattern.test(text));

  const tags = matched.map((item) => item.tag);
  const category = matched.find((item) => item.category)?.category;

  const priority = matched
    .map((item) => item.priority)
    .filter((value): value is "low" | "medium" | "high" => Boolean(value))
    .sort((left, right) => priorityRank(right) - priorityRank(left))[0];

  return { tags, category, priority };
}

function applyKeywordEnrichment(
  base: EmailTriageResult,
  input: EmailTriageInput
): EmailTriageResult {
  const signals = keywordSignals(input.subject, input.bodySummary);

  const enrichedPriority =
    signals.priority && priorityRank(signals.priority) > priorityRank(base.priority)
      ? signals.priority
      : base.priority;

  const enrichedCategory = signals.category ?? base.category;
  const enrichedTags = mergeTags(base.tags, signals.tags);

  const forceKeepByKeyword = signals.tags.length > 0;

  return {
    ...base,
    keep: base.keep || forceKeepByKeyword,
    category: enrichedCategory,
    tags: enrichedTags,
    priority: enrichedPriority,
    important: base.important || enrichedPriority === "high",
  };
}

function fallbackTriage(input: EmailTriageInput): Promise<EmailTriageResult> {
  const text = `${input.subject} ${input.bodySummary}`.toLowerCase();
  const looksPromotional = USELESS_KEYWORDS.some((word) => text.includes(word));
  const important = /urgent|asap|deadline|invoice|client|meeting|action required/i.test(text);

  return categorizeItem({
    title: input.subject,
    description: input.bodySummary,
    source: "Email",
  }).then((categorized) => ({
    keep: important || !looksPromotional,
    reason: important ? "important" : looksPromotional ? "promotional_or_low_value" : "relevant",
    category: categorized.category,
    tags: categorized.tags,
    priority: important ? "high" : categorized.priority,
    important,
  })).then((result) => applyKeywordEnrichment(result, input));
}

async function groqTriage(input: EmailTriageInput): Promise<EmailTriageResult | null> {
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
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You triage productivity emails. Return strict JSON with keys: keep (boolean), reason (short string), category (one of Work, Study, Personal, Meetings, Projects, Today, Upcoming), tags (string array max 5), priority (low|medium|high), important (boolean). Mark keep=false for obvious marketing/newsletters/promotions/non-actionable noise.",
          },
          {
            role: "user",
            content: JSON.stringify({
              provider: input.provider,
              sender: input.sender ?? "",
              subject: input.subject,
              bodySummary: input.bodySummary,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<EmailTriageResult>;

    const validCategory = ["Work", "Study", "Personal", "Meetings", "Projects", "Today", "Upcoming"].includes(
      String(parsed.category)
    )
      ? String(parsed.category)
      : "Personal";

    const validPriority: "low" | "medium" | "high" =
      parsed.priority === "low" || parsed.priority === "high" ? parsed.priority : "medium";

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((item) => typeof item === "string").slice(0, 5)
      : [];

    const result: EmailTriageResult = {
      keep: Boolean(parsed.keep),
      reason: typeof parsed.reason === "string" ? parsed.reason : "triaged",
      category: validCategory,
      tags,
      priority: validPriority,
      important: Boolean(parsed.important),
    };

    return applyKeywordEnrichment(result, input);
  } catch {
    return null;
  }
}

export async function triageEmail(input: EmailTriageInput): Promise<EmailTriageResult> {
  const result = await groqTriage(input);
  if (result) return result;
  return fallbackTriage(input);
}
