import random
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.kid import Kid
from app.models.problem import Problem
from app.models.story_template import StoryTemplate, TemplateStage
from app.models.story import UserStory, UserStoryKid, UserStoryProblem, UserSeenProblem
from app.schemas.story import (
    StoryGenerateRequest,
    StoryResponse,
    StoryListResponse,
    StoryListItemResponse,
    StageResponse,
    ProblemResponse,
    StoryKidResponse,
)
from app.middleware.auth_middleware import get_current_user
from app.services.openai_service import (
    openai_service,
    StoryGenerationParams,
    KidInfo,
    parse_story_into_stages,
)

router = APIRouter()


def generate_story_title(theme: str, role: str) -> str:
    return f"{role} in {theme}"


def render_problem_text(text: str, kid_name: str) -> str:
    """Replace {name} placeholder with actual kid name."""
    return text.replace("{name}", kid_name)


async def get_or_create_template(
    db: AsyncSession,
    theme: str,
    role: str,
    mode: str,
    num_stages: int,
    params: StoryGenerationParams,
    model: str,
) -> StoryTemplate:
    """Get existing template or create a new one via LLM."""
    # Check for existing template
    result = await db.execute(
        select(StoryTemplate)
        .options(selectinload(StoryTemplate.stages))
        .where(
            StoryTemplate.theme == theme,
            StoryTemplate.role == role,
            StoryTemplate.mode == mode,
            StoryTemplate.num_stages == num_stages,
        )
    )
    template = result.scalar_one_or_none()

    if template:
        return template

    # Generate new narrative via LLM
    narrative = await openai_service.generate_story_narrative(params, model=model)
    stage_contents = parse_story_into_stages(narrative)

    # Create template
    template = StoryTemplate(
        theme=theme,
        role=role,
        mode=mode,
        num_stages=num_stages,
        raw_narrative=narrative,
    )
    db.add(template)
    await db.flush()

    # Create stages
    for i, content in enumerate(stage_contents):
        stage = TemplateStage(
            template_id=template.id,
            stage_number=i + 1,
            content=content,
        )
        db.add(stage)

    await db.flush()
    await db.refresh(template)

    # Re-fetch with stages loaded
    result = await db.execute(
        select(StoryTemplate)
        .options(selectinload(StoryTemplate.stages))
        .where(StoryTemplate.id == template.id)
    )
    return result.scalar_one()


async def get_or_create_problems(
    db: AsyncSession,
    user_id: UUID,
    subject: str,
    grade: str,
    difficulty: int,
    count: int,
    kid: KidInfo,
    all_kids: list[KidInfo],
    country: str | None,
    model: str,
) -> list[Problem]:
    """Get unused problems from bank or generate new ones."""
    # Get IDs of problems user has already seen
    seen_result = await db.execute(
        select(UserSeenProblem.problem_id).where(UserSeenProblem.user_id == user_id)
    )
    seen_problem_ids = {row[0] for row in seen_result.fetchall()}

    # Query available problems
    query = select(Problem).where(
        Problem.subject == subject,
        Problem.grade == grade,
        Problem.difficulty_level == difficulty,
    )
    if seen_problem_ids:
        query = query.where(Problem.id.notin_(seen_problem_ids))

    result = await db.execute(query)
    available_problems = list(result.scalars().all())

    # If we have enough, pick randomly
    if len(available_problems) >= count:
        return random.sample(available_problems, count)

    # Need to generate more problems
    problems_needed = count - len(available_problems)

    # Generate via LLM
    new_problem_results = await openai_service.generate_puzzles_for_kid(
        subject=subject,
        kid=kid,
        all_kids=all_kids,
        count=problems_needed,
        country=country,
        model=model,
    )

    # Save new problems to bank
    new_problems = []
    for pr in new_problem_results:
        problem = Problem(
            subject=subject,
            grade=grade,
            difficulty_level=difficulty,
            problem_text=pr.problem_text,
            solution=pr.solution,
        )
        db.add(problem)
        new_problems.append(problem)

    await db.flush()

    # Combine available + new
    return available_problems + new_problems


@router.post("/generate", response_model=StoryResponse)
async def generate_story(
    request: StoryGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new story with reuse of templates and problems where possible.
    """
    # Fetch kids
    result = await db.execute(
        select(Kid).where(
            Kid.id.in_(request.kid_ids),
            Kid.user_id == current_user.id,
        )
    )
    kids = list(result.scalars().all())

    if len(kids) != len(request.kid_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more kid IDs not found",
        )

    # Convert to KidInfo for OpenAI service
    kid_infos = [
        KidInfo(
            name=kid.name,
            alias=kid.alias,
            grade=kid.grade,
            difficulty_level=kid.difficulty_level,
        )
        for kid in kids
    ]

    params = StoryGenerationParams(
        subject=request.subject,
        mode=request.mode,
        role=request.role,
        theme=request.theme,
        questions_per_kid=request.questions_per_kid,
        kids=kid_infos,
    )

    model = current_user.preferred_model

    # Get or create story template
    template = await get_or_create_template(
        db=db,
        theme=request.theme,
        role=request.role,
        mode=request.mode,
        num_stages=request.questions_per_kid,
        params=params,
        model=model,
    )

    # Create user story
    title = generate_story_title(request.theme, request.role)
    user_story = UserStory(
        user_id=current_user.id,
        template_id=template.id,
        title=title,
        subject=request.subject,
    )
    db.add(user_story)
    await db.flush()

    # Create kid snapshots
    story_kids = {}
    for kid, kid_info in zip(kids, kid_infos):
        story_kid = UserStoryKid(
            story_id=user_story.id,
            kid_id=kid.id,
            kid_name=kid.name,
            kid_grade=kid.grade,
            kid_difficulty=kid.difficulty_level,
            kid_alias=kid.alias,
        )
        db.add(story_kid)
        await db.flush()
        story_kids[kid.alias] = story_kid

    # Get or generate problems for each kid and stage
    for stage_num in range(1, request.questions_per_kid + 1):
        for kid, kid_info in zip(kids, kid_infos):
            problems = await get_or_create_problems(
                db=db,
                user_id=current_user.id,
                subject=request.subject,
                grade=kid.grade,
                difficulty=kid.difficulty_level,
                count=1,  # One problem per kid per stage
                kid=kid_info,
                all_kids=kid_infos,
                country=current_user.country,
                model=model,
            )

            if problems:
                problem = problems[0]

                # Mark as seen
                seen = UserSeenProblem(
                    user_id=current_user.id,
                    problem_id=problem.id,
                )
                db.add(seen)

                # Create story problem with rendered text
                story_problem = UserStoryProblem(
                    story_id=user_story.id,
                    stage_number=stage_num,
                    story_kid_id=story_kids[kid.alias].id,
                    problem_id=problem.id,
                    problem_text_rendered=render_problem_text(problem.problem_text, kid.name),
                    solution_rendered=render_problem_text(problem.solution, kid.name),
                )
                db.add(story_problem)

    await db.commit()

    # Build response
    return await _build_story_response(db, user_story.id)


async def _build_story_response(db: AsyncSession, story_id: UUID) -> StoryResponse:
    """Build full story response from database."""
    # Fetch story with all relationships
    result = await db.execute(
        select(UserStory)
        .options(
            selectinload(UserStory.template).selectinload(StoryTemplate.stages),
            selectinload(UserStory.story_kids),
            selectinload(UserStory.story_problems),
        )
        .where(UserStory.id == story_id)
    )
    story = result.scalar_one()

    # Build kids response
    kids_response = [
        StoryKidResponse(
            id=sk.id,
            name=sk.kid_name,
            grade=sk.kid_grade,
            difficulty_level=sk.kid_difficulty,
            alias=sk.kid_alias,
        )
        for sk in story.story_kids
    ]

    # Build stages response
    stages_response = []
    template_stages = sorted(story.template.stages, key=lambda s: s.stage_number)

    for template_stage in template_stages:
        # Get problems for this stage
        stage_problems = [
            p for p in story.story_problems if p.stage_number == template_stage.stage_number
        ]

        # Find corresponding story kid for each problem
        problems_response = []
        for sp in stage_problems:
            story_kid = next((sk for sk in story.story_kids if sk.id == sp.story_kid_id), None)
            if story_kid:
                problems_response.append(
                    ProblemResponse(
                        kid_alias=story_kid.kid_alias,
                        kid_name=story_kid.kid_name,
                        text=sp.problem_text_rendered,
                        solution=sp.solution_rendered,
                    )
                )

        # Replace aliases in content with actual names
        content = template_stage.content
        for sk in story.story_kids:
            content = content.replace(sk.kid_alias, sk.kid_name)

        stages_response.append(
            StageResponse(
                stage_number=template_stage.stage_number,
                content=content,
                problems=problems_response,
            )
        )

    return StoryResponse(
        id=story.id,
        title=story.title,
        subject=story.subject,
        mode=story.template.mode,
        role=story.template.role,
        theme=story.template.theme,
        kids=kids_response,
        stages=stages_response,
        created_at=story.created_at,
    )


@router.get("", response_model=StoryListResponse)
async def list_stories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """
    List all stories for the current user.
    """
    # Get total count
    count_result = await db.execute(
        select(func.count(UserStory.id)).where(UserStory.user_id == current_user.id)
    )
    total = count_result.scalar()

    # Get stories
    result = await db.execute(
        select(UserStory)
        .options(
            selectinload(UserStory.template),
            selectinload(UserStory.story_kids),
        )
        .where(UserStory.user_id == current_user.id)
        .order_by(UserStory.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    stories = result.scalars().all()

    items = [
        StoryListItemResponse(
            id=story.id,
            title=story.title,
            subject=story.subject,
            mode=story.template.mode,
            num_stages=story.template.num_stages,
            num_kids=len(story.story_kids),
            kid_names=[sk.kid_name for sk in story.story_kids],
            created_at=story.created_at,
        )
        for story in stories
    ]

    return StoryListResponse(stories=items, total=total)


@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific story by ID.
    """
    result = await db.execute(
        select(UserStory).where(
            UserStory.id == story_id,
            UserStory.user_id == current_user.id,
        )
    )
    story = result.scalar_one_or_none()

    if story is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found",
        )

    return await _build_story_response(db, story_id)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(
    story_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a story.
    """
    result = await db.execute(
        select(UserStory).where(
            UserStory.id == story_id,
            UserStory.user_id == current_user.id,
        )
    )
    story = result.scalar_one_or_none()

    if story is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found",
        )

    await db.delete(story)
