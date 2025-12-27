// storyGenerator.ts
import { StoryGenerationParams } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5-nano';

type ProblemSlot = { id: number; kid: string };

/**
 * Convert grade string to number for comparison
 */
function gradeToNumber(grade: string): number {
  if (grade === 'K') return 0;
  return parseInt(grade, 10) || 0;
}

/**
 * Build story skeleton prompt (no puzzles yet)
 */
function buildStorySkeletonPrompt(params: StoryGenerationParams): string {
  const { theme, role, questionsPerKid, kids } = params;
  const totalStages = kids.length * questionsPerKid;
  const youngestGrade = kids.reduce((min, k) => {
    const num = gradeToNumber(k.grade);
    return num < gradeToNumber(min) ? k.grade : min;
  }, kids[0].grade);

  const kidAliases = kids.map(k => k.alias).join(', ');

  return `
You are a children's bedtime story writer creating an interactive adventure.

Create a mystery story with EXACTLY ${totalStages} stages.

STORY STRUCTURE:
- The children (${kidAliases}) are ${role} exploring ${theme}
- Each stage presents a challenge that blocks their path forward
- Solving the problem in each stage unlocks the next part of the adventure
- The story should feel like a quest where each puzzle is a key to progress

FORMATTING RULES (STRICT):
- Start each stage with: === STAGE X ===
- Write engaging narration that sets up why they need to solve a problem
- End each stage's narration with a situation where they encounter an obstacle
- Place EXACTLY ONE placeholder where the problem should go:
  <PROBLEM_SLOT id="X" kid="ALIAS_NAME" />
- Assign kids in round-robin order: ${kidAliases}
- Do NOT write any actual puzzles or solutions

LANGUAGE:
- Keep it age-appropriate for Grade ${youngestGrade}
- Use vivid descriptions but simple vocabulary
- Make it feel magical and adventurous

End with a satisfying conclusion AFTER the final stage where they achieve their goal.

Begin now.
`.trim();
}

/**
 * Generate story skeleton from LLM
 */
async function generateStorySkeleton(
  params: StoryGenerationParams,
  apiKey: string
): Promise<string> {
  const prompt = buildStorySkeletonPrompt(params);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You write children\'s adventure stories. Follow formatting rules exactly. Do not include puzzles.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error('Story generation failed: empty response');
  return content;
}

/**
 * Extract problem slots from story skeleton
 */
function extractProblemSlots(story: string): ProblemSlot[] {
  const regex = /<PROBLEM_SLOT id="(\d+)" kid="([^"]+)" \/>/g;
  const slots: ProblemSlot[] = [];

  let match;
  while ((match = regex.exec(story)) !== null) {
    slots.push({ id: Number(match[1]), kid: match[2] });
  }

  return slots;
}

/**
 * Puzzle response structure
 */
interface PuzzleResponse {
  puzzles: Array<{
    slotId: number;
    kid: string;
    problem: string;
    solution: string;
  }>;
}

/**
 * Build puzzle generation prompt (no story)
 */
function buildPuzzlePrompt(params: StoryGenerationParams, slots: ProblemSlot[]): string {
  const { subject, kids } = params;

  const slotDetails = slots.map(slot => {
    const kid = kids.find(k => k.alias === slot.kid)!;
    return {
      slotId: slot.id,
      kid: kid.alias,
      grade: kid.grade,
      difficulty: kid.difficultyLevel,
    };
  });

  const subjectGuidance =
    subject === 'math'
      ? `Math puzzles:
- Difficulty 1: Simple counting, basic addition/subtraction
- Difficulty 2: Two-digit arithmetic, simple patterns
- Difficulty 3: Word problems, multiplication/division basics
- Difficulty 4: Multi-step problems, fractions, geometry
- Difficulty 5: Complex logic, algebra concepts`
      : `Reading puzzles:
- Difficulty 1: Rhyming words, letter patterns
- Difficulty 2: Simple riddles, fill-in-the-blank
- Difficulty 3: Word puzzles, vocabulary challenges
- Difficulty 4: Logic riddles, comprehension questions
- Difficulty 5: Complex wordplay, inference puzzles`;

  return `
Generate ${slots.length} puzzles as JSON.

PUZZLE REQUIREMENTS:
${subjectGuidance}

Match each puzzle to the kid's grade level and difficulty setting.
Puzzles should feel like "unlocking a door" to continue the adventure.

SLOTS:
${JSON.stringify(slotDetails, null, 2)}

Respond with JSON in this exact format:
{
  "puzzles": [
    {
      "slotId": <number>,
      "kid": "<alias>",
      "problem": "<puzzle question text>",
      "solution": "<clear step-by-step solution>"
    }
  ]
}
`.trim();
}

/**
 * Generate puzzles from LLM
 */
async function generatePuzzles(
  params: StoryGenerationParams,
  slots: ProblemSlot[],
  apiKey: string
): Promise<Map<number, string>> {
  const prompt = buildPuzzlePrompt(params, slots);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You generate educational puzzles for children. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Puzzle generation failed: empty response');

  // Parse JSON response
  let puzzleData: PuzzleResponse;
  try {
    puzzleData = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse puzzle response as JSON');
  }

  if (!puzzleData.puzzles || puzzleData.puzzles.length < slots.length) {
    console.warn(`Expected ${slots.length} puzzles, got ${puzzleData.puzzles?.length || 0}`);
  }

  // Convert to map with XML format for stitching
  const map = new Map<number, string>();
  puzzleData.puzzles.forEach((puzzle) => {
    const xmlBlock = `<PROBLEM kid="${puzzle.kid}">
${puzzle.problem}
</PROBLEM>
<SOLUTION>
${puzzle.solution}
</SOLUTION>`;
    map.set(puzzle.slotId, xmlBlock);
  });

  return map;
}

/**
 * Stitch puzzles into story
 */
function stitchStory(story: string, puzzles: Map<number, string>): string {
  return story.replace(/<PROBLEM_SLOT id="(\d+)" kid="[^"]+" \/>/g, (_, id) => {
    const puzzle = puzzles.get(Number(id));
    if (!puzzle) throw new Error(`Missing puzzle for slot ${id}`);
    return puzzle;
  });
}

/**
 * Public API
 */
export async function generateStory(
  params: StoryGenerationParams,
  apiKey: string
): Promise<string> {
  // 1️⃣ Generate skeleton
  const skeleton = await generateStorySkeleton(params, apiKey);

  // 2️⃣ Extract slots
  const slots = extractProblemSlots(skeleton);
  if (slots.length === 0) throw new Error('No problem slots found');

  // 3️⃣ Generate puzzles
  const puzzles = await generatePuzzles(params, slots, apiKey);

  // 4️⃣ Stitch and return
  return stitchStory(skeleton, puzzles);
}
