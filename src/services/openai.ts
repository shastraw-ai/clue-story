import { StoryGenerationParams } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildPrompt(params: StoryGenerationParams): string {
  const { subject, role, theme, questionsPerKid, kids } = params;
  const totalStages = kids.length * questionsPerKid;

  const kidsInfo = kids
    .map((k) => `- ${k.alias}: Grade ${k.grade}, Difficulty Level ${k.difficultyLevel}/5`)
    .join('\n');

  const subjectGuidance =
    subject === 'math'
      ? 'Math puzzles: arithmetic, word problems, patterns, geometry, logic puzzles appropriate for their grade'
      : 'Reading puzzles: comprehension questions, vocabulary challenges, fill-in-blanks, riddles, word puzzles appropriate for their grade';

  return `You are a creative bedtime story writer for children. Create an interactive mystery story with the following parameters:

SUBJECT: ${subject.charAt(0).toUpperCase() + subject.slice(1)}
THEME: ${theme}
ROLE: The children are ${role}

PARTICIPANTS:
${kidsInfo}

REQUIREMENTS:
1. Create exactly ${totalStages} stages total (${questionsPerKid} puzzles per child)
2. Each stage should advance the plot and include ONE puzzle/problem
3. Alternate problems between children in a round-robin fashion: ${kids.map((k) => k.alias).join(', ')}
4. Puzzle type: ${subjectGuidance}
5. Adjust puzzle difficulty based on each child's grade level and difficulty setting:
   - Difficulty 1: Very simple puzzles
   - Difficulty 2: Basic logic, simple patterns
   - Difficulty 3: Moderate reasoning required
   - Difficulty 4: More complex logic, multiple steps
   - Difficulty 5: Challenging puzzles, abstract thinking

FORMATTING RULES (FOLLOW EXACTLY):
- Start each stage with "=== STAGE X ===" on its own line (where X is the stage number)
- For each problem, use this EXACT format:
  <PROBLEM kid="ALIAS_NAME">
  Problem description here
  </PROBLEM>
- Immediately after each problem, include:
  <SOLUTION>
  Solution explanation here
  </SOLUTION>
- Write engaging narrative between the stage marker and the problem
- Use the alias names in the story (${kids.map((k) => k.alias).join(', ')})
- Keep language age-appropriate for the youngest participant (Grade ${kids.reduce((min, k) => (k.grade < min ? k.grade : min), kids[0].grade)})
- End with a satisfying conclusion after all puzzles are solved

Begin the story now:`;
}

export async function generateStory(
  params: StoryGenerationParams,
  apiKey: string
): Promise<string> {
  const prompt = buildPrompt(params);

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a creative storyteller who writes engaging bedtime stories with educational puzzles for children. Always follow the formatting rules exactly.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `API request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in API response');
  }

  return content;
}
