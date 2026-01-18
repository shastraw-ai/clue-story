import { Kid, StoryStage, ProblemContent } from '../types';

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
        stageNumber: 1,
        content: rawResponse,
        problems: [],
      },
    ];
  }

  return stageParts.map((stagePart, index) => {
    const problems: ProblemContent[] = [];

    // Extract ALL PROBLEM tags with their SOLUTION tags
    const problemRegex = /<PROBLEM\s+kid="([^"]+)">([\s\S]*?)<\/PROBLEM>\s*<SOLUTION>([\s\S]*?)<\/SOLUTION>/gi;
    let match;

    while ((match = problemRegex.exec(stagePart)) !== null) {
      const kidAlias = match[1].trim();
      const kid = kids.find(
        (k) => k.alias.toLowerCase() === kidAlias.toLowerCase()
      );
      problems.push({
        kidAlias,
        kidName: kid?.name || kidAlias,
        text: match[2].trim(),
        solution: match[3].trim(),
      });
    }

    // Clean content (remove all problem/solution tags, keep narrative)
    const content = stagePart
      .replace(/<PROBLEM[^>]*>[\s\S]*?<\/PROBLEM>/gi, '')
      .replace(/<SOLUTION>[\s\S]*?<\/SOLUTION>/gi, '')
      .trim();

    return {
      stageNumber: index + 1,
      content,
      problems,
    };
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
