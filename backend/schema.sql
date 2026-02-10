-- Clue Story Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url VARCHAR(500),
    country VARCHAR(10) DEFAULT 'US',
    preferred_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kids table (only stores alias, not real name for privacy)
CREATE TABLE IF NOT EXISTS kids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade VARCHAR(10) NOT NULL,
    difficulty_level INTEGER NOT NULL,
    alias VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems bank
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(20) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    difficulty_level INTEGER NOT NULL,
    problem_text TEXT NOT NULL,
    solution TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_problems_lookup ON problems(subject, grade, difficulty_level);

-- Story templates (reusable narratives)
CREATE TABLE IF NOT EXISTS story_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    num_stages INTEGER NOT NULL,
    raw_narrative TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_template UNIQUE (theme, role, mode, num_stages)
);

-- Template stages
CREATE TABLE IF NOT EXISTS template_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES story_templates(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    CONSTRAINT uq_template_stage UNIQUE (template_id, stage_number)
);

-- User stories (generated stories for a user)
CREATE TABLE IF NOT EXISTS user_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES story_templates(id),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User story kids (snapshot of kid at story generation time)
CREATE TABLE IF NOT EXISTS user_story_kids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES kids(id) ON DELETE SET NULL,
    kid_grade VARCHAR(10) NOT NULL,
    kid_difficulty INTEGER NOT NULL,
    kid_alias VARCHAR(50) NOT NULL
);

-- User story problems (problems assigned in each stage)
CREATE TABLE IF NOT EXISTS user_story_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    story_kid_id UUID NOT NULL REFERENCES user_story_kids(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id),
    problem_text_rendered TEXT NOT NULL,
    solution_rendered TEXT NOT NULL
);

-- User seen problems (track to avoid repetition)
CREATE TABLE IF NOT EXISTS user_seen_problems (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_user_seen_problems ON user_seen_problems(user_id);
