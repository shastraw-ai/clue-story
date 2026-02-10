import { StoryStage, ProblemContent } from '../types';

/**
 * Parses the raw OpenAI response into structured story stages
 */
export function parseStoryResponse(rawResponse: string): StoryStage[] {
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
      problems.push({
        kidAlias,
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
 * Generates a title for the story based on theme and role
 */
export function generateStoryTitle(theme: string, role: string): string {
  return `${role} in ${theme}`;
}
