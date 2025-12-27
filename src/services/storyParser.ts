import { Kid, StoryStage } from '../types';

/**
 * Parses the raw OpenAI response into structured story stages
 */
export function parseStoryResponse(rawResponse: string, kids: Kid[]): StoryStage[] {
  // Split by stage markers (=== STAGE X ===)
  const stageRegex = /===\s*STAGE\s*\d+\s*===/gi;
  const stageParts = rawResponse.split(stageRegex).filter((s) => s.trim());

  // If no stages found, treat the whole response as one stage
  if (stageParts.length === 0) {
    return [
      {
        content: rawResponse,
        problem: undefined,
        solution: undefined,
      },
    ];
  }

  return stageParts.map((stagePart) => {
    const stage: StoryStage = { content: '' };

    // Extract PROBLEM tag
    const problemMatch = stagePart.match(
      /<PROBLEM\s+kid="([^"]+)">([\s\S]*?)<\/PROBLEM>/i
    );

    if (problemMatch) {
      const kidAlias = problemMatch[1].trim();
      const kid = kids.find(
        (k) => k.alias.toLowerCase() === kidAlias.toLowerCase()
      );
      stage.problem = {
        kidAlias,
        kidName: kid?.name || kidAlias,
        text: problemMatch[2].trim(),
      };
    }

    // Extract SOLUTION tag
    const solutionMatch = stagePart.match(/<SOLUTION>([\s\S]*?)<\/SOLUTION>/i);

    if (solutionMatch) {
      stage.solution = solutionMatch[1].trim();
    }

    // Clean content (remove tags, keep narrative)
    let content = stagePart
      .replace(/<PROBLEM[^>]*>[\s\S]*?<\/PROBLEM>/gi, '')
      .replace(/<SOLUTION>[\s\S]*?<\/SOLUTION>/gi, '')
      .trim();

    stage.content = content;

    return stage;
  });
}

/**
 * Replaces alias names with real kid names in the text
 */
export function replaceAliasesWithNames(text: string, kids: Kid[]): string {
  let result = text;

  kids.forEach((kid) => {
    // Replace whole word matches only (case insensitive)
    const regex = new RegExp(`\\b${escapeRegExp(kid.alias)}\\b`, 'gi');
    result = result.replace(regex, kid.name);
  });

  return result;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates a title for the story based on theme and role
 */
export function generateStoryTitle(theme: string, role: string): string {
  return `${role} in ${theme}`;
}
