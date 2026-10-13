BEGIN;
CREATE TABLE IF NOT EXISTS assessment_reading_texts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),cycle_year integer NOT NULL,title text NOT NULL,author text NOT NULL,
 source_url text NOT NULL,reviewed boolean NOT NULL DEFAULT false,UNIQUE(cycle_year,title)
);
CREATE TABLE IF NOT EXISTS assessment_blueprints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject_id uuid NOT NULL REFERENCES subjects(id),cycle_year integer NOT NULL,
 title text NOT NULL,version integer NOT NULL DEFAULT 1,status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','active','retired')),
 total_questions integer NOT NULL CHECK(total_questions BETWEEN 1 AND 180),duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 180),
 reading_text_id uuid REFERENCES assessment_reading_texts(id),source_url text NOT NULL,
 overlap_limit numeric NOT NULL DEFAULT 0.5 CHECK(overlap_limit BETWEEN 0 AND 1),
 difficulty_targets jsonb NOT NULL DEFAULT '{"easy":30,"medium":50,"hard":20}' CHECK(jsonb_typeof(difficulty_targets)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(subject_id,cycle_year,version)
);
CREATE UNIQUE INDEX IF NOT EXISTS blueprint_one_active_idx ON assessment_blueprints(subject_id,cycle_year) WHERE status='active';
CREATE TABLE IF NOT EXISTS assessment_cells (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),blueprint_id uuid NOT NULL REFERENCES assessment_blueprints(id),code text NOT NULL,title text NOT NULL,
 kind text NOT NULL CHECK(kind IN('single','comprehension','cloze','reading_text')),required_count integer NOT NULL CHECK(required_count BETWEEN 1 AND 60),
 position integer NOT NULL CHECK(position>=0),UNIQUE(blueprint_id,code),UNIQUE(blueprint_id,position),UNIQUE(id,blueprint_id)
);
CREATE TABLE IF NOT EXISTS assessment_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),subject_id uuid NOT NULL REFERENCES subjects(id),passage_id uuid NOT NULL REFERENCES passages(id),
 kind text NOT NULL CHECK(kind IN('comprehension','cloze')),title text NOT NULL,reviewed boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS question_assessment_classifications (
 blueprint_id uuid NOT NULL REFERENCES assessment_blueprints(id),question_id uuid NOT NULL REFERENCES questions(id),cell_id uuid NOT NULL,
 group_id uuid REFERENCES assessment_groups(id),group_position integer CHECK(group_position>0),reading_text_id uuid REFERENCES assessment_reading_texts(id),
 chapter text,content_family text NOT NULL,PRIMARY KEY(blueprint_id,question_id),
 FOREIGN KEY(cell_id,blueprint_id) REFERENCES assessment_cells(id,blueprint_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS classification_family_unique_idx ON question_assessment_classifications(blueprint_id,content_family);
CREATE UNIQUE INDEX IF NOT EXISTS classification_group_position_idx ON question_assessment_classifications(blueprint_id,group_id,group_position) WHERE group_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS assessment_blueprint_templates (
 id text PRIMARY KEY,title text NOT NULL,total_questions integer NOT NULL,cycle_year integer,source_url text NOT NULL,cells jsonb NOT NULL
);
INSERT INTO assessment_blueprint_templates(id,title,total_questions,cycle_year,source_url,cells) VALUES
 ('english-2026','JAMB Use of English — 2026 structure',60,2026,'https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf',
 '[{"code":"comprehension","title":"Comprehension passage","kind":"comprehension","count":5},{"code":"cloze","title":"Cloze passage","kind":"cloze","count":10},{"code":"reading-text","title":"Prescribed reading text","kind":"reading_text","count":10},{"code":"interpretation","title":"Sentence interpretation","kind":"single","count":5},{"code":"antonyms","title":"Antonyms","kind":"single","count":5},{"code":"synonyms","title":"Synonyms","kind":"single","count":5},{"code":"completion","title":"Sentence completion","kind":"single","count":10},{"code":"oral","title":"Oral forms","kind":"single","count":10}]'),
 ('elective-coverage','Elective subject coverage — review syllabus domains',40,NULL,'https://ibass.jamb.gov.ng/',
 '[{"code":"coverage","title":"Reviewed subject topic coverage","kind":"single","count":40}]') ON CONFLICT DO NOTHING;
ALTER TABLE assessment_blueprint_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON assessment_blueprint_templates FROM PUBLIC,anon,authenticated;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS blueprint_manifest jsonb;
ALTER TABLE assessment_reading_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_assessment_classifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON assessment_reading_texts,assessment_blueprints,assessment_cells,assessment_groups,question_assessment_classifications FROM PUBLIC,anon,authenticated;
COMMIT;
