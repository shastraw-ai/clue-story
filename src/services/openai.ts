// storyGenerator.ts
import { StoryGenerationParams, Kid, StoryStage, ProblemContent } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Debug flag - set to true to see logs
const DEBUG = false;

function debugLog(label: string, data: unknown) {
  if (DEBUG) {
    console.log(`\n========== ${label} ==========`);
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log('================================\n');
  }
}

/**
 * Convert grade string to number for comparison
 */
function gradeToNumber(grade: string): number {
  if (grade === 'K') return 0;
  return parseInt(grade, 10) || 0;
}

/**
 * Build story skeleton prompt (narrative only, no puzzles)
 */
function buildStoryPrompt(params: StoryGenerationParams): string {
  const { theme, role, questionsPerKid, kids } = params;
  const totalStages = questionsPerKid;
  const youngestGrade = kids.reduce((min, k) => {
    const num = gradeToNumber(k.grade);
    return num < gradeToNumber(min) ? k.grade : min;
  }, kids[0].grade);

  const kidAliases = kids.map(k => k.alias).join(', ');

  return `
You are a children's bedtime story writer.

Create a story with EXACTLY ${totalStages} stages.

CHARACTERS: ${kidAliases}

STORY:
- The children are ${role} exploring ${theme}
- Each stage has a challenge for the team
- Make it magical and adventurous

FORMAT:
- Start each stage with: === STAGE X ===
- Write 2-3 paragraphs per stage
- Do NOT include any puzzles - just narrative
- End with a conclusion after stage ${totalStages}

Keep language appropriate for Grade ${youngestGrade}.
`.trim();
}

/**
 * Build puzzle prompt - simple: N problems per kid at their level
 */
function buildPuzzlePrompt(params: StoryGenerationParams): string {
  const { subject, questionsPerKid, kids } = params;
  const subjectType = subject === 'math' ? 'math word problems' : 'reading/language problems';

  const kidRequirements = kids.map(k =>
    `- "${k.alias}": ${questionsPerKid} problems for Grade ${k.grade}, Difficulty ${k.difficultyLevel}/5`
  ).join('\n');

  return `
Generate ${subjectType} for these children:

${kidRequirements}

DIFFICULTY GUIDE:
- Difficulty 1/5: Very easy, basic concepts
- Difficulty 2/5: Easy, simple problems
- Difficulty 3/5: Medium, grade-appropriate challenge
- Difficulty 4/5: Hard, requires more thinking
- Difficulty 5/5: Very challenging, advanced for grade level

GRADE LEVELS:
- Grade K = Kindergarten (age 5-6)
- Grade 1-2 = Early elementary (age 6-8)
- Grade 3-4 = Upper elementary (age 8-10)
- Grade 5-6 = Middle school prep (age 10-12)

IMPORTANT:
- All problems must be WORD PROBLEMS with a story context (e.g., "Emma has 5 apples and finds 3 more. How many apples does she have?")
- Do NOT use raw arithmetic like "5+3=" or "342+89"
- Make problems fun and relatable for children

Respond with JSON:
{
  "kidAlias1": [
    { "problem": "...", "solution": "..." }
  ],
  "kidAlias2": [
    { "problem": "...", "solution": "..." }
  ]
}

Use the exact kid names as keys: ${kids.map(k => k.alias).join(', ')}
`.trim();
}

/**
 * Generate story narrative from LLM
 */
async function generateStoryNarrative(
  params: StoryGenerationParams,
  apiKey: string
): Promise<string> {
  const prompt = buildStoryPrompt(params);
  debugLog('STORY PROMPT', prompt);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You write children\'s adventure stories. Follow formatting exactly.' },
        { role: 'user', content: prompt },
      ],
      max_completion_tokens: 3000,
    }),
  });

  const data = await response.json();
  debugLog('STORY RESPONSE', data);

  if (!response.ok) {
    throw new Error(data.error?.message || `API error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Story generation failed: empty response');
  }

  return content;
}

/**
 * Puzzle response type - map of kidAlias to array of problems
 */
type PuzzlesByKid = Record<string, Array<{ problem: string; solution: string }>>;

/**
 * Generate puzzles from LLM
 */
async function generatePuzzles(
  params: StoryGenerationParams,
  apiKey: string
): Promise<PuzzlesByKid> {
  const prompt = buildPuzzlePrompt(params);
  debugLog('PUZZLE PROMPT', prompt);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Generate educational puzzles. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
    }),
  });

  const data = await response.json();
  debugLog('PUZZLE RESPONSE', data);

  if (!response.ok) {
    throw new Error(data.error?.message || `API error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Puzzle generation failed: empty response');
  }

  return JSON.parse(content) as PuzzlesByKid;
}

/**
 * Parse story narrative into stages (just the text content)
 */
function parseStoryIntoStages(narrative: string): string[] {
  const stageRegex = /===\s*STAGE\s*\d+\s*===/gi;
  const parts = narrative.split(stageRegex).filter(s => s.trim());
  return parts.map(p => p.trim());
}

/**
 * Combine story stages with puzzles
 */
function combineStoryAndPuzzles(
  stageContents: string[],
  puzzles: PuzzlesByKid,
  kids: Kid[]
): StoryStage[] {
  return stageContents.map((content, stageIndex) => {
    const problems: ProblemContent[] = [];

    // For each kid, get their puzzle for this stage
    kids.forEach(kid => {
      // Try exact match first, then case-insensitive
      const kidPuzzles = puzzles[kid.alias] ||
        puzzles[kid.alias.toLowerCase()] ||
        Object.entries(puzzles).find(([key]) =>
          key.toLowerCase() === kid.alias.toLowerCase()
        )?.[1];

      if (kidPuzzles && kidPuzzles[stageIndex]) {
        problems.push({
          kidAlias: kid.alias,
          kidName: kid.name,
          text: kidPuzzles[stageIndex].problem,
          solution: kidPuzzles[stageIndex].solution,
        });
      }
    });

    return { content, problems };
  });
}

/**
 * Public API - generates complete story with puzzles
 */
export async function generateStory(
  params: StoryGenerationParams,
  apiKey: string
): Promise<{ stages: StoryStage[]; rawResponse: string }> {
  // 1. Generate story narrative
  const narrative = await generateStoryNarrative(params, apiKey);

  // 2. Generate puzzles for each kid
  const puzzles = await generatePuzzles(params, apiKey);

  // 3. Parse story into stages
  const stageContents = parseStoryIntoStages(narrative);

  // 4. Combine stages with puzzles
  const stages = combineStoryAndPuzzles(stageContents, puzzles, params.kids);

  return {
    stages,
    rawResponse: narrative + '\n\n---PUZZLES---\n' + JSON.stringify(puzzles, null, 2),
  };
}
