// storyGenerator.ts
import { StoryGenerationParams, Kid, StoryStage, ProblemContent } from '../types';
import { getGradeSystemNote } from '../constants/countries';

import { LLMModel, DEFAULT_MODEL } from '../stores/settingsStore';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
 * Get math concepts appropriate for grade level
 */
function getMathConceptsForGrade(grade: string): string {
  const gradeNum = gradeToNumber(grade);

  if (gradeNum <= 2) {
    // Grades K-2
    return `
MATH CONCEPTS FOR THIS GRADE:
- Counting objects (up to 100 for grade 2)
- Basic addition (single digits, sums up to 20)
- Basic subtraction (single digits)
- Skip counting by 2s, 5s, 10s
- Comparing numbers (greater than, less than)
- Simple patterns
- Telling time (hours, half hours)
- Basic shapes recognition`;
  } else if (gradeNum <= 4) {
    // Grades 3-4
    return `
MATH CONCEPTS FOR THIS GRADE:
- Multiplication facts (up to 12x12)
- Division with and without remainders
- Simple fractions (1/2, 1/3, 1/4, comparing fractions)
- Adding and subtracting fractions with same denominator
- Multi-digit addition and subtraction (with regrouping)
- Introduction to area and perimeter
- Word problems with multiple steps
- Rounding numbers
- Basic measurement conversions`;
  } else if (gradeNum <= 6) {
    // Grades 5-6
    return `
MATH CONCEPTS FOR THIS GRADE:
- All fraction operations (add, subtract, multiply, divide fractions)
- Decimal operations (add, subtract, multiply, divide)
- Converting between fractions, decimals, and percentages
- Area and perimeter of complex shapes (triangles, parallelograms)
- Volume of rectangular prisms and cylinders
- Order of operations (PEMDAS/BODMAS)
- Introduction to negative numbers
- Ratio and proportion
- Mean, median, mode
- Coordinate graphing basics`;
  } else {
    // Grades 7+
    return `
MATH CONCEPTS FOR THIS GRADE:
- Percentages and percentage change (discounts, interest, tax)
- Ratios and proportional reasoning
- Basic algebra (solving for x, simplifying expressions)
- Linear equations and graphing
- Geometry (angle relationships, triangle properties, circle calculations)
- Probability and statistics
- Exponents and scientific notation
- Pythagorean theorem
- Systems of equations (basic)
- Surface area and volume of 3D shapes`;
  }
}

/**
 * Get adjusted difficulty description - makes the scale more challenging
 */
function getAdjustedDifficultyDescription(difficulty: number): string {
  const descriptions: Record<number, string> = {
    1: `Difficulty 1/5: Easy but engaging - basic concepts with straightforward application. Should still require some thinking.`,
    2: `Difficulty 2/5: Moderate - requires understanding of concepts and 1-2 step problem solving. Not trivial.`,
    3: `Difficulty 3/5: Challenging - multi-step problems requiring careful reasoning. Should make the child think hard.`,
    4: `Difficulty 4/5: Hard - complex problems that push the boundaries of grade-level understanding.`,
    5: `Difficulty 5/5: Very challenging - problems at the edge of or slightly beyond grade level. Requires advanced reasoning.`,
  };
  return descriptions[difficulty] || descriptions[3];
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

Create EXACTLY ${totalStages} stage outlines. Each stage should lead naturally to the next.

CHARACTERS: ${kidAliases}
SETTING: ${theme}
ROLE: The children are ${role}

For each stage, provide a BRIEF plot outline with these elements:
- Setting/Location for this stage
- What the children encounter (magical character, obstacle, discovery)
- The challenge setup (what blocks their progress)

FORMAT:
=== STAGE X ===
• Setting: [where they are]
• Encounter: [who/what they meet]
• Challenge: [what blocks their progress]

After stage ${totalStages}, add a brief conclusion.
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
function buildPuzzlePromptForKid(subject: string, kid: Kid, allKids: Kid[], count: number, country?: string): string {
  const subjectType = subject === 'math' ? 'math word problems' : 'reading/language problems';
  const mathConcepts = subject === 'math' ? getMathConceptsForGrade(kid.grade) : '';

  // Country context for grade system understanding
  const countryContext = country
    ? `\nNOTE: This child is in the ${getGradeSystemNote(country)}. Adjust problem context appropriately.`
    : '';

  // Build name instruction based on number of kids
  const otherKids = allKids.filter(k => k.alias !== kid.alias);
  const nameInstruction = otherKids.length > 0
    ? `- IMPORTANT: Use "${kid.alias}" as the main character in the problems. You may also include other children: ${otherKids.map(k => k.alias).join(', ')} to make problems more social/interactive (e.g., "${kid.alias} and ${otherKids[0].alias} are sharing cookies...")`
    : `- IMPORTANT: Use the child's name "${kid.alias}" in the problems to make them personal (e.g., "${kid.alias} has 5 apples...")`;

  return `
Generate ${count} ${subjectType} for a child named ${kid.alias}.

CHILD INFO:
- Name: ${kid.alias}
- Grade: ${kid.grade}
- Difficulty: ${kid.difficultyLevel}/5
${countryContext}

${getAdjustedDifficultyDescription(kid.difficultyLevel)}

GRADE LEVELS (Reference):
- Grade K = Kindergarten (age 5-6)
- Grade 1-2 = Early elementary (age 6-8)
- Grade 3-4 = Upper elementary (age 8-10)
- Grade 5-6 = Middle school prep (age 10-12)
- Grade 7-8 = Middle school (age 12-14)
- Grade 9-12 = High school (age 14-18)
${mathConcepts}

CRITICAL REQUIREMENTS:
- All problems must be WORD PROBLEMS with a fun, engaging story context
${nameInstruction}
- Do NOT use raw arithmetic like "5+3=" or "342+89"
- Problems should feel like mini-adventures or puzzles within a story
- Each problem should be different and creative
- The difficulty should GENUINELY match the specified level - do NOT make problems too easy
- For difficulty 3+ include problems that require multiple steps or careful reasoning
- Challenge the child appropriately - easy problems waste their potential

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
  apiKey: string,
  model: LLMModel = DEFAULT_MODEL
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
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_completion_tokens: params.mode === 'plot' ? 2500 : 5000,
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
  allKids: Kid[],
  count: number,
  apiKey: string,
  country?: string,
  model: LLMModel = DEFAULT_MODEL
): Promise<Array<{ problem: string; solution: string }>> {
  const prompt = buildPuzzlePromptForKid(subject, kid, allKids, count, country);
  debugLog(`PUZZLE PROMPT FOR ${kid.alias}`, prompt);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Generate educational puzzles for children. Respond only with valid JSON. Make problems appropriately challenging - do not make them too easy.' },
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
  apiKey: string,
  country?: string,
  model: LLMModel = DEFAULT_MODEL
): Promise<PuzzlesByKid> {
  const { subject, questionsPerKid, kids } = params;

  // Make parallel API calls for each kid
  const puzzlePromises = kids.map(kid =>
    generatePuzzlesForKid(subject, kid, kids, questionsPerKid, apiKey, country, model)
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
  apiKey: string,
  country?: string,
  model: LLMModel = DEFAULT_MODEL
): Promise<{ stages: StoryStage[]; rawResponse: string }> {
  // 1. Generate story narrative
  const narrative = await generateStoryNarrative(params, apiKey, model);

  // 2. Generate puzzles for each kid
  const puzzles = await generatePuzzles(params, apiKey, country, model);

  // 3. Parse story into stages
  const stageContents = parseStoryIntoStages(narrative);

  // 4. Combine stages with puzzles
  const stages = combineStoryAndPuzzles(stageContents, puzzles, params.kids);

  return {
    stages,
    rawResponse: narrative + '\n\n---PUZZLES---\n' + JSON.stringify(puzzles, null, 2),
  };
}
