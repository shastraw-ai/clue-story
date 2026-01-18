import re
import asyncio
from dataclasses import dataclass
import httpx

from app.config import get_settings

settings = get_settings()

OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

# Country grade system notes
COUNTRY_GRADE_NOTES = {
    "US": "US grades K-12 system",
    "GB": "UK system: Reception, Years 1-13. Year 1 ≈ US Grade K, Year 7 ≈ US Grade 6",
    "CA": "Canadian grades similar to US K-12 system",
    "AU": "Australian system: Prep/Foundation, Years 1-12",
    "IN": "Indian system: Classes/Standards 1-12, LKG/UKG for kindergarten",
    "SG": "Singapore: Primary 1-6, Secondary 1-4",
    "NZ": "NZ: Years 1-13, Year 1 starts at age 5",
    "IE": "Irish system: Junior/Senior Infants, 1st-6th class (primary), 1st-6th year (secondary)",
    "PH": "Philippine K-12 system similar to US",
    "ZA": "South African Grades R-12 (R = Reception)",
}


def get_grade_system_note(country_code: str) -> str:
    return COUNTRY_GRADE_NOTES.get(country_code, "Using US grade equivalents as reference")


def grade_to_number(grade: str) -> int:
    if grade == "K":
        return 0
    try:
        return int(grade)
    except ValueError:
        return 0


def get_math_concepts_for_grade(grade: str) -> str:
    grade_num = grade_to_number(grade)

    if grade_num <= 2:
        return """
MATH CONCEPTS FOR THIS GRADE:
- Counting objects (up to 100 for grade 2)
- Basic addition (single digits, sums up to 20)
- Basic subtraction (single digits)
- Skip counting by 2s, 5s, 10s
- Comparing numbers (greater than, less than)
- Simple patterns
- Telling time (hours, half hours)
- Basic shapes recognition"""

    elif grade_num <= 4:
        return """
MATH CONCEPTS FOR THIS GRADE:
- Multiplication facts (up to 12x12)
- Division with and without remainders
- Simple fractions (1/2, 1/3, 1/4, comparing fractions)
- Adding and subtracting fractions with same denominator
- Multi-digit addition and subtraction (with regrouping)
- Introduction to area and perimeter
- Word problems with multiple steps
- Rounding numbers
- Basic measurement conversions"""

    elif grade_num <= 6:
        return """
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
- Coordinate graphing basics"""

    else:
        return """
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
- Surface area and volume of 3D shapes"""


def get_adjusted_difficulty_description(difficulty: int) -> str:
    descriptions = {
        1: "Difficulty 1/5: Easy but engaging - basic concepts with straightforward application. Should still require some thinking.",
        2: "Difficulty 2/5: Moderate - requires understanding of concepts and 1-2 step problem solving. Not trivial.",
        3: "Difficulty 3/5: Challenging - multi-step problems requiring careful reasoning. Should make the child think hard.",
        4: "Difficulty 4/5: Hard - complex problems that push the boundaries of grade-level understanding.",
        5: "Difficulty 5/5: Very challenging - problems at the edge of or slightly beyond grade level. Requires advanced reasoning.",
    }
    return descriptions.get(difficulty, descriptions[3])


@dataclass
class KidInfo:
    name: str
    alias: str
    grade: str
    difficulty_level: int


@dataclass
class StoryGenerationParams:
    subject: str  # 'math' | 'reading'
    mode: str  # 'plot' | 'story'
    role: str
    theme: str
    questions_per_kid: int
    kids: list[KidInfo]


@dataclass
class ProblemResult:
    problem_text: str  # Uses {name} placeholder
    solution: str


def build_plot_prompt(params: StoryGenerationParams) -> str:
    kid_aliases = ", ".join(k.alias for k in params.kids)
    total_stages = params.questions_per_kid

    return f"""
You are helping a parent tell a bedtime story.

Create EXACTLY {total_stages} stage outlines. Each stage should lead naturally to the next.

CHARACTERS: {kid_aliases}
SETTING: {params.theme}
ROLE: The children are {params.role}

For each stage, provide a BRIEF plot outline with these elements:
- Setting/Location for this stage
- What the children encounter (magical character, obstacle, discovery)
- The challenge setup (what blocks their progress)

FORMAT:
=== STAGE X ===
• Setting: [where they are]
• Encounter: [who/what they meet]
• Challenge: [what blocks their progress]

After stage {total_stages}, add a brief conclusion.
""".strip()


def build_full_story_prompt(params: StoryGenerationParams) -> str:
    kid_aliases = ", ".join(k.alias for k in params.kids)
    kid_count = len(params.kids)
    total_stages = params.questions_per_kid

    # Find youngest grade
    youngest_grade = min(params.kids, key=lambda k: grade_to_number(k.grade)).grade

    return f"""
You are a children's bedtime story writer.

Create a story with EXACTLY {total_stages} stages.

CHARACTERS: {kid_aliases} ({kid_count} children who are the heroes)

STORY:
- The children are {params.role} exploring {params.theme}
- Each stage they encounter a magical character (wizard, fairy, talking animal, etc.)
- The magical character blocks their path and says each child must solve a puzzle to pass
- Make it exciting and adventurous

FORMAT:
- Start each stage with: === STAGE X ===
- Write 2-3 paragraphs describing the adventure and encounter
- End each stage with the magical character announcing that each child must solve their own puzzle
- Do NOT write the actual puzzles - just set up that puzzles are needed
- After stage {total_stages}, write a brief happy conclusion

EXAMPLE STAGE ENDING:
"The wise owl hooted softly. 'To cross this bridge, each of you must answer my riddle,' she said, looking at {kid_aliases} in turn."

Keep language appropriate for Grade {youngest_grade}.
""".strip()


def build_story_prompt(params: StoryGenerationParams) -> str:
    if params.mode == "plot":
        return build_plot_prompt(params)
    return build_full_story_prompt(params)


def build_puzzle_prompt_for_kid(
    subject: str,
    kid: KidInfo,
    all_kids: list[KidInfo],
    count: int,
    country: str | None = None,
) -> str:
    subject_type = "math word problems" if subject == "math" else "reading/language problems"
    math_concepts = get_math_concepts_for_grade(kid.grade) if subject == "math" else ""

    country_context = ""
    if country:
        country_context = f"\nNOTE: This child is in the {get_grade_system_note(country)}. Adjust problem context appropriately."

    # Build name instruction based on number of kids
    other_kids = [k for k in all_kids if k.alias != kid.alias]
    if other_kids:
        other_names = ", ".join(k.alias for k in other_kids)
        name_instruction = f'- IMPORTANT: Use "{{name}}" as a placeholder for the main character in the problems. You may also include other children: {other_names} to make problems more social/interactive (e.g., "{{name}} and {other_kids[0].alias} are sharing cookies...")'
    else:
        name_instruction = '- IMPORTANT: Use "{{name}}" as a placeholder for the child\'s name in the problems to make them personal (e.g., "{{name}} has 5 apples...")'

    return f"""
Generate {count} {subject_type} for a child.

CHILD INFO:
- Grade: {kid.grade}
- Difficulty: {kid.difficulty_level}/5
{country_context}

{get_adjusted_difficulty_description(kid.difficulty_level)}

GRADE LEVELS (Reference):
- Grade K = Kindergarten (age 5-6)
- Grade 1-2 = Early elementary (age 6-8)
- Grade 3-4 = Upper elementary (age 8-10)
- Grade 5-6 = Middle school prep (age 10-12)
- Grade 7-8 = Middle school (age 12-14)
- Grade 9-12 = High school (age 14-18)
{math_concepts}

CRITICAL REQUIREMENTS:
- All problems must be WORD PROBLEMS with a fun, engaging story context
{name_instruction}
- Do NOT use raw arithmetic like "5+3=" or "342+89"
- Problems should feel like mini-adventures or puzzles within a story
- Each problem should be different and creative
- The difficulty should GENUINELY match the specified level - do NOT make problems too easy
- For difficulty 3+ include problems that require multiple steps or careful reasoning
- Challenge the child appropriately - easy problems waste their potential

Respond with JSON:
{{
  "problems": [
    {{ "problem": "...", "solution": "..." }}
  ]
}}
""".strip()


def parse_story_into_stages(narrative: str) -> list[str]:
    """Split narrative by === STAGE X === markers."""
    stage_regex = re.compile(r"===\s*STAGE\s*\d+\s*===", re.IGNORECASE)
    parts = stage_regex.split(narrative)
    return [p.strip() for p in parts if p.strip()]


class OpenAIService:
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.api_url = OPENAI_API_URL

    async def _call_openai(
        self,
        messages: list[dict],
        model: str = "gpt-4o-mini",
        max_tokens: int = 2000,
        json_mode: bool = False,
    ) -> str:
        """Make a call to OpenAI API."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            body = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}

            response = await client.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json=body,
            )

            if response.status_code != 200:
                error_data = response.json()
                raise Exception(f"OpenAI API error: {error_data.get('error', {}).get('message', 'Unknown error')}")

            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_story_narrative(
        self,
        params: StoryGenerationParams,
        model: str = "gpt-4o-mini",
    ) -> str:
        """Generate story narrative."""
        prompt = build_story_prompt(params)
        max_tokens = 2500 if params.mode == "plot" else 5000

        system_prompt = (
            "You create brief story outlines for parents. Follow formatting exactly."
            if params.mode == "plot"
            else "You write children's adventure stories. Follow formatting exactly."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        return await self._call_openai(messages, model=model, max_tokens=max_tokens)

    async def generate_puzzles_for_kid(
        self,
        subject: str,
        kid: KidInfo,
        all_kids: list[KidInfo],
        count: int,
        country: str | None,
        model: str = "gpt-4o-mini",
    ) -> list[ProblemResult]:
        """Generate puzzles for a single kid."""
        prompt = build_puzzle_prompt_for_kid(subject, kid, all_kids, count, country)

        messages = [
            {
                "role": "system",
                "content": "Generate educational puzzles for children. Respond only with valid JSON. Make problems appropriately challenging - do not make them too easy.",
            },
            {"role": "user", "content": prompt},
        ]

        content = await self._call_openai(messages, model=model, max_tokens=2000, json_mode=True)

        import json
        parsed = json.loads(content)
        problems = parsed.get("problems", [])

        return [
            ProblemResult(problem_text=p["problem"], solution=p["solution"])
            for p in problems
        ]

    async def generate_puzzles_parallel(
        self,
        subject: str,
        kids: list[KidInfo],
        count: int,
        country: str | None,
        model: str = "gpt-4o-mini",
    ) -> dict[str, list[ProblemResult]]:
        """Generate puzzles for all kids in parallel."""
        tasks = [
            self.generate_puzzles_for_kid(subject, kid, kids, count, country, model)
            for kid in kids
        ]
        results = await asyncio.gather(*tasks)

        return {kid.alias: result for kid, result in zip(kids, results)}


openai_service = OpenAIService()
