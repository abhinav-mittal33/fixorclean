import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize SDKs — API keys MUST come from environment variables
if (!process.env.GROQ_API_KEY) console.warn('[AI Engine] GROQ_API_KEY not set');
if (!process.env.CEREBRAS_API_KEY) console.warn('[AI Engine] CEREBRAS_API_KEY not set');
if (!process.env.GEMINI_API_KEY) console.warn('[AI Engine] GEMINI_API_KEY not set');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Defined hierarchy of fallback models
const fallbackChain = [
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'cerebras', model: 'llama3.1-8b' },
  { provider: 'gemini', model: 'gemini-1.5-flash' }
];

/**
 * Universal execution wrapper that cascades through providers if one fails.
 */
async function executeWithFallback(prompt: string, maxTokens: number = 2048, useJson: boolean = true): Promise<string> {
  let lastError: any = null;

  for (const step of fallbackChain) {
    try {
      console.log(`[AI Engine] Attempting request via ${step.provider} (${step.model})`);
      
      if (step.provider === 'groq') {
        const res = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: step.model,
          temperature: 0.1,
          max_tokens: maxTokens,
          response_format: useJson ? { type: 'json_object' } : undefined,
        });
        return res.choices[0]?.message?.content || '';
      } 
      else if (step.provider === 'cerebras') {
        const cerebrasReq = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY || ""}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: step.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: maxTokens,
            response_format: useJson ? { type: 'json_object' } : undefined
          })
        });
        if (!cerebrasReq.ok) {
           throw new Error(`Cerebras HTTP Error: ${cerebrasReq.status} ${cerebrasReq.statusText}`);
        }
        const res = await cerebrasReq.json();
        return res.choices[0]?.message?.content || '';
      } 
      else if (step.provider === 'gemini') {
        const res = await geminiModel.generateContent({
           contents: [{ role: 'user', parts: [{ text: prompt }] }],
           generationConfig: {
             temperature: 0.1,
             maxOutputTokens: maxTokens,
             responseMimeType: useJson ? "application/json" : "text/plain"
           }
        });
        return res.response.text() || '';
      }
    } catch (e: any) {
      console.warn(`[AI Engine] ${step.provider} (${step.model}) failed:`, e?.message || e);
      lastError = e;
      continue;
    }
  }
  
  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
}


// Helper: recursively find the first array in a JSON response (LLM wraps under arbitrary keys)
function extractArray(obj: unknown): unknown[] {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') {
        const nested = extractArray(value);
        if (nested.length > 0) return nested;
      }
    }
  }
  return [];
}

export interface CleaningSuggestion {
  row: number;
  column: string;
  original: string;
  suggested: string;
  rule: string;
  confidence: number;
  category: 'email' | 'phone' | 'category' | 'name' | 'number' | 'null' | 'duplicate' | 'troll' | 'date';
}

export interface AnalysisInsight {
  type: 'anomaly' | 'trend' | 'comparison' | 'summary';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TextTheme {
  theme: string;
  percentage: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  representativeQuote: string;
  count: number;
}

export async function getCleaningSuggestions(
  data: Record<string, string>[],
  columns: { name: string; type: string }[],
  userRules: Record<string, string> = {}
): Promise<CleaningSuggestion[]> {
  const sampleSize = Math.min(data.length, 50);
  const sample = data.slice(0, sampleSize);
  const sampleWithTokens = sample.map((r, i) => ({ _row_index: i, ...r }));

  const customRulesText = Object.entries(userRules)
    .filter(([_, rule]) => rule.trim() !== '')
    .map(([col, rule]) => `\n- Column "${col}": User wants format like "${rule}"`)
    .join('');

  const prompt = `You are a data cleaning and formatting engine. You must find ALL data quality issues AND apply user formatting rules.

Column Schema: ${JSON.stringify(columns)}

Sample data (first ${sampleSize} rows):
${JSON.stringify(sampleWithTokens, null, 2)}

=== MANDATORY DATA QUALITY CHECKS (ALWAYS apply to ALL columns) ===
1. EMAILS: Fix domain typos (gmal.com→gmail.com, gmail→gmail.com). Flag emails missing "@" entirely (like "riyasharma.com" should become "riyasharma@gmail.com"). If only domain after @ is missing (like "aman@"), leave it unchanged.
2. EMPTY/NULL: Flag rows with missing critical data (empty Name, empty Age, etc). Suggest "(missing)" and ALWAYS set confidence to 0 for missing data.
3. OUT-OF-RANGE: If a column name contains "Rating (1-5)" or similar, flag values like 0, 6, -1 as out-of-range. If Age is negative, flag it. For out of range or invalid numbers (like "three" in a number column or numbers outside the allowed scale), NEVER try to guess the correct number (e.g. do NOT guess that a 0 rating is a 1, a 6 rating is a 5, or "three" means 3). Suggest "(invalid)" and ALWAYS set confidence to 0.
4. TEXT-AS-NUMBER: In ANY column where the majority of values are numeric, flag values that are spelled-out words and convert them ("twenty two"→"22", "three"→"3"). Do not skip this check just because the column type is open_text.
5. DATE FORMAT: Normalize inconsistent formats ("2026/04/01 10:42:33"→"2026-04-01 10:42:33").
6. CATEGORY: Standardize categories (M/Male/male→Male, F/Female/female→Female).
${customRulesText ? `
=== USER CUSTOM FORMAT RULES (override default formatting for that column) ===
${customRulesText}

Deduce the PATTERN from the user's example:
- "M/F" → Male becomes M, Female becomes F
- "INDIA" → convert all values to UPPERCASE
- "abhinav MITTAL" → lowercase firstname, UPPERCASE lastname
- "01-04-2005" → DD-MM-YYYY format
- "twenty" → digits to English words
Apply custom rules to EVERY row in that column.
` : ''}
CRITICAL: You must return suggestions for BOTH quality issues AND custom formatting. Never skip quality checks.

For each issue return: row (MUST BE the exact \`_row_index\` provided in the JSON), column (exact name), original, suggested, rule (short), confidence (0-100), category ("email"|"phone"|"category"|"name"|"number"|"null"|"duplicate"|"troll"|"date")

Output JSON:
{
  "suggestions": [
    {"row":0,"column":"Gender","original":"Male","suggested":"M","rule":"Custom: M/F","confidence":100,"category":"category"},
    {"row":1,"column":"Email","original":"riyasharma.com","suggested":"riyasharma@gmail.com","rule":"Missing @ in email","confidence":85,"category":"email"},
    {"row":3,"column":"Rating (1-5)","original":"6","suggested":"5","rule":"Rating out of 1-5 range","confidence":90,"category":"number"}
  ]
}`;
  try {
    const content = await executeWithFallback(prompt, 4000, true);
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) { parsed = {"suggestions":[]}; }
    const result = extractArray(parsed) as CleaningSuggestion[];
    return result;
  } catch (error: any) {
    console.error('AI cleaning error:', error);
    throw new Error(error?.message || 'AI cleaning failed. All providers returned errors.');
  }
}

export async function generateAnalysisInsights(
  data: Record<string, string>[],
  columns: { name: string; type: string }[]
): Promise<AnalysisInsight[]> {
  const prompt = `You are a high-level data analyst for a global enterprise. Your task is to analyze this clean, validated survey dataset and uncover genuine behavioral insights, profound trends, and strategic takeaways about the respondents.

CRITICAL RULE: DO NOT look for data errors, typos, missing emails, or invalid values. Assume the data is verified. Focus ENTIRELY on the meaning of the data (e.g. sales, demographic behavior, sentiment, correlations).

Column types: ${JSON.stringify(columns)}
Total responses: ${data.length}
Sample data: ${JSON.stringify(data.slice(0, 30), null, 2)}

Return a JSON object with an "insights" array. Each insight should have:
- type: "behavioral", "trend", "opportunity", or "summary"
- title: A punchy, executive-level title
- description: 2-3 sentence strategic description using specific numbers/percentages. DO NOT mention data formatting or cleaning.
- severity: "high", "medium", or "low" (representing strategic business importance)

Find at least 3-5 high-quality insights. Be specific with numbers and percentages.
Return ONLY valid JSON.`;

  try {
    const content = await executeWithFallback(prompt, 2048, true);
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) { parsed = {"insights":[]}; }
    return parsed.insights || [];
  } catch (error) {
    console.error('Analysis insight error:', error);
    return [];
  }
}

export async function generateReportSummary(
  data: Record<string, string>[],
  columns: { name: string; type: string }[],
  insights: AnalysisInsight[]
): Promise<string> {
  const prompt = `You are the Chief Data Officer presenting a final intelligence report to global executives. Write a professional 3-paragraph summary of the behavioral, demographic, and sentiment findings in this survey data.

CRITICAL RULE: DO NOT MENTION DATA CLEANING, TYPOS, FORMATTING ERRORS, OR INVALID VALUES. Assume the data is 100% clean and validated. We ONLY care about the actual business/research meaning of the data (e.g., satisfaction rates, geographic distribution, core themes, sales/performance metrics).

Dataset: ${data.length} responses
Columns: ${JSON.stringify(columns.map(c => c.name))}
Strategic insights: ${JSON.stringify(insights)}
Sample data: ${JSON.stringify(data.slice(0, 20), null, 2)}

Write specific, factual paragraphs with real numbers from the data. No TEMPLATES with blanks. Focus on the grand narrative of what this data is telling us about the respondents. The summary should be ready to paste into a global keynote presentation. Return ONLY the text, no JSON wrapper.`;

  try {
    const content = await executeWithFallback(prompt, 1024, false);
    return content || 'Unable to generate summary.';
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Unable to generate summary at this time (all AI providers failed).';
  }
}

export async function clusterOpenTextResponses(
  responses: string[]
): Promise<TextTheme[]> {
  const prompt = `Analyze these open-text survey responses and cluster them into themes.

Responses (${responses.length} total):
${JSON.stringify(responses.slice(0, 100))}

Return a JSON object with a "themes" array. Each theme:
- theme: theme label (3-6 words)
- percentage: % of responses in this theme
- sentiment: "positive", "negative", or "neutral"
- representativeQuote: the most representative actual response
- count: number of responses in this theme

Group into 3-7 themes. Ensure percentages sum to approximately 100%.
Return ONLY valid JSON.`;

  try {
    const content = await executeWithFallback(prompt, 2048, true);
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) { parsed = {"themes":[]}; }
    return parsed.themes || [];
  } catch (error) {
    console.error('Text clustering error:', error);
    return [];
  }
}

export async function checkSurveyDesign(
  rawFormText: string
): Promise<{
  score: number;
  dimensions: { name: string; score: number; issues: string[] }[];
  suggestions: { question: number; issue: string; fix: string }[];
}> {
    const prompt = `You are a survey design expert. 
I have scraped the raw text and internal Javascript data structure from a survey. Read through the text, identify the questions being asked (ignore formatting/code text, focus on actual questions like "What is your age?"), and score this survey out of 100.

BASIS FOR SCORING (100-point rubric):
1. Clarity: Are questions straightforward, lacking confusing/double-barreled language? (25 pts)
2. Scale Balance: Do categorical/scale answers have symmetrical options (e.g. 2 positive, 2 negative, 1 neutral)? (25 pts)
3. Bias Risk: Are there leading questions pushing the user to a specific answer? (25 pts)
4. Length & Structure: Is the survey a reasonable length without brutal drop-off points? Do questions follow logical order? (25 pts)

Raw Survey Data:
${rawFormText.substring(0, 25000)}

Return a JSON object with:
- score: overall score 0-100
- dimensions: array of { name: "clarity"|"scale_balance"|"bias_risk"|"length", score: 0-100, issues: string[] }
- suggestions: array of { question: question index (1-based) OR question text, issue: what's wrong, fix: specific actionable fix }

Be highly specific. Quote the exact questions that are problematic. Give actionable fixes.
If you see a lot of data but no clear questions, look closely at the "Form Structure Data" arrays, because Google Forms stores questions in complex nested arrays.
Return ONLY valid JSON.`;

  try {
    const content = await executeWithFallback(prompt, 2048, true);
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch (e) { parsed = {"score":0,"dimensions":[],"suggestions":[]}; }
    return parsed;
  } catch (error) {
    console.error('Design check error:', error);
    return { score: 0, dimensions: [], suggestions: [] };
  }
}
