BEGIN;
CREATE TABLE IF NOT EXISTS curriculum_topic_mappings (
 topic_id uuid PRIMARY KEY REFERENCES topics(id) ON DELETE CASCADE,
 parent_topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
 source_subject text NOT NULL, source_url text NOT NULL, source_hash text NOT NULL,
 page_number integer NOT NULL CHECK(page_number>0), aliases jsonb NOT NULL DEFAULT '[]',
 reviewed_by uuid REFERENCES profiles(id), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE curriculum_topic_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON curriculum_topic_mappings FROM anon,authenticated;
INSERT INTO subjects(code,name,is_compulsory,is_active,display_order) VALUES ('ARB','Arabic',false,false,16),('ART','Art',false,false,17),('CMP','Computer Studies',false,false,18),('FRN','French',false,false,19),('HAU','Hausa',false,false,20),('HEC','Home Economics',false,false,21),('IGB','Igbo',false,false,22),('MUS','Music',false,false,23),('PHE','Physical and Health Education',false,false,24),('YOR','Yoruba',false,false,25) ON CONFLICT(code) DO NOTHING;
COMMIT;
