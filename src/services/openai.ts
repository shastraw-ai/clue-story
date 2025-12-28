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
 * Build plot mode prompt - brief outlines for parent improvisation
 */
function buildPlotPrompt(params: StoryGenerationParams): string {
  const { theme, role, questionsPerKid, kids } = params;
  const totalStages = questionsPerKid;
  const kidAliases = kids.map(k => k.alias).join(', ');

  return `
You are helping a parent tell a bedtime story.

Create EXACTLY ${totalStages} stage outlines.

CHARACTERS: ${kidAliases}
SETTING: ${theme}
ROLE: The children are ${role}

For each stage, provide a BRIEF plot outline with these elements:
- Setting/Location for this stage
- What the children encounter (magical character, obstacle, discovery)
- The challenge setup (what blocks their progress)
- Mood/atmosphere hint

FORMAT:
=== STAGE X ===
• Setting: [where they are]
• Encounter: [who/what they meet]
• Challenge: [what blocks their progress]
• Mood: [atmosphere - mysterious, exciting, cozy, etc.]

Keep each stage to 4-5 lines maximum. Parents will improvise the full story.
After stage ${totalStages}, add a brief conclusion outline.
`.trim();
}

/**
 * Build story mode prompt - full narrative where characters present challenges
 */
function buildFullStoryPrompt(params: StoryGenerationParams): string {
  const { theme, role, questionsPerKid, kids } = params;
  const totalStages = questionsPerKid;
  const youngestGrade = kids.reduce((min, k) => {
    const num = gradeToNumber(k.grade);
    return num < gradeToNumber(min) ? k.grade : min;
  }, kids[0].grade);

  const kidAliases = kids.map(k => k.alias).join(', ');
  const kidCount = kids.length;

  return `
You are a children's bedtime story writer.

Create a story with EXACTLY ${totalStages} stages.

CHARACTERS: ${kidAliases} (${kidCount} children who are the heroes)

STORY:
- The children are ${role} exploring ${theme}
- Each stage they encounter a magical character (wizard, fairy, talking animal, etc.)
- The magical character blocks their path and says each child must solve a puzzle to pass
- Make it exciting and adventurous

FORMAT:
- Start each stage with: === STAGE X ===
- Write 2-3 paragraphs describing the adventure and encounter
- End each stage with the magical character announcing that each child must solve their own puzzle
- Do NOT write the actual puzzles - just set up that puzzles are needed
- After stage ${totalStages}, write a brief happy conclusion

EXAMPLE STAGE ENDING:
"The wise owl hooted softly. 'To cross this bridge, each of you must answer my riddle,' she said, looking at ${kidAliases} in turn."

Keep language appropriate for Grade ${youngestGrade}.
`.trim();
}

/**
 * Build story prompt based on mode
 */
function buildStoryPrompt(params: StoryGenerationParams): string {
  if (params.mode === 'plot') {
    return buildPlotPrompt(params);
  }
  return buildFullStoryPrompt(params);
}

/**
 * Build puzzle prompt for a single kid
 */
function buildPuzzlePromptForKid(subject: string, kid: Kid, count: number): string {
  const subjectType = subject === 'math' ? 'math word problems' : 'reading/language problems';

  return `
Generate ${count} ${subjectType} for a child.

CHILD INFO:
- Grade: ${kid.grade}
- Difficulty: ${kid.difficultyLevel}/5

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
- All problems must be WORD PROBLEMS with a fun story context
- Do NOT use raw arithmetic like "5+3=" or "342+89"
- Make problems engaging and relatable for children
- Each problem should be different and creative

Respond with JSON:
{
  "problems": [
    { "problem": "...", "solution": "..." }
  ]
}
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

  const systemPrompt = params.mode === 'plot'
    ? 'You create brief story outlines for parents. Follow formatting exactly.'
    : 'You write children\'s adventure stories. Follow formatting exactly.';

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_completion_tokens: params.mode === 'plot' ? 1500 : 3000,
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
 * Generate puzzles for a single kid
 */
async function generatePuzzlesForKid(
  subject: string,
  kid: Kid,
  count: number,
  apiKey: string
): Promise<Array<{ problem: string; solution: string }>> {
  const prompt = buildPuzzlePromptForKid(subject, kid, count);
  debugLog(`PUZZLE PROMPT FOR ${kid.alias}`, prompt);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Generate educational puzzles for children. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  debugLog(`PUZZLE RESPONSE FOR ${kid.alias}`, data);

  if (!response.ok) {
    throw new Error(data.error?.message || `API error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Puzzle generation failed for ${kid.alias}: empty response`);
  }

  const parsed = JSON.parse(content) as { problems: Array<{ problem: string; solution: string }> };
  return parsed.problems || [];
}

/**
 * Generate puzzles for all kids (one API call per kid, in parallel)
 */
async function generatePuzzles(
  params: StoryGenerationParams,
  apiKey: string
): Promise<PuzzlesByKid> {
  const { subject, questionsPerKid, kids } = params;

  // Make parallel API calls for each kid
  const puzzlePromises = kids.map(kid =>
    generatePuzzlesForKid(subject, kid, questionsPerKid, apiKey)
      .then(problems => ({ alias: kid.alias, problems }))
  );

  const results = await Promise.all(puzzlePromises);

  // Combine into PuzzlesByKid format
  const puzzlesByKid: PuzzlesByKid = {};
  results.forEach(({ alias, problems }) => {
    puzzlesByKid[alias] = problems;
  });

  debugLog('ALL PUZZLES', puzzlesByKid);
  return puzzlesByKid;
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
