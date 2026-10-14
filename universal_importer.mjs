import fs from "fs";
import crypto from "crypto";
import postgres from "postgres";
import {resolveExactImportTopic} from "./scripts/import-topic-resolution.mjs";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node universal_importer.mjs <csv_path>");
  process.exit(1);
}

const ACTOR_ID = "2b08c3d4-12f9-446b-af37-7f26f1fd3529";

const envFile = fs.readFileSync("/Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/.env.local", "utf8");
const dbUrl = envFile.split("\n").find(l => l.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length).trim();
const sql = postgres(dbUrl, { max: 5 });

function parseCSV(text) {
  const lines = [];
  let cur = "";
  let inQuotes = false;
  let curRow = [];
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      curRow.push(cur);
      cur = "";
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i+1] === '\n') {
        i++;
      }
      curRow.push(cur);
      cur = "";
      if (curRow.length > 1 || curRow[0].length > 0) {
        lines.push(curRow);
      }
      curRow = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || curRow.length > 0) {
    curRow.push(cur);
    lines.push(curRow);
  }
  return lines;
}

async function run() {
  console.log(`Reading CSV: ${csvPath}...`);
  const content = fs.readFileSync(csvPath, "utf8");
  const allRows = parseCSV(content);
  if (allRows.length <= 1) {
    throw new Error("No data rows found in CSV!");
  }
  
  const header = allRows[0].map(h => h.trim().toLowerCase());
  const rows = allRows.slice(1);
  console.log(`Loaded ${rows.length} rows to import. Headers:`, header);

  const idx = {
    subj: header.indexOf("subject_code"),
    year: header.indexOf("exam_year"),
    qnum: header.indexOf("question_number"),
    qtext: header.indexOf("question_text"),
    oa: header.indexOf("option_a"),
    ob: header.indexOf("option_b"),
    oc: header.indexOf("option_c"),
    od: header.indexOf("option_d"),
    ans: header.indexOf("correct_option"),
    exp: header.indexOf("explanation"),
    topic: header.indexOf("topic"),
  };

  const subjectCode = rows[0][idx.subj].trim().toUpperCase();
  const [subject] = await sql`SELECT id, name FROM subjects WHERE code = ${subjectCode}`;
  if (!subject) throw new Error(`Subject ${subjectCode} not found in database!`);
  const subjectId = subject.id;
  console.log(`Target subject: ${subject.name} (${subjectCode}, ID: ${subjectId})`);

  // Fetch topics for this subject
  const topics = await sql`SELECT id, title, slug FROM topics WHERE subject_id = ${subjectId}`;
  // Validate every source topic before creating a job or writing any batch.
  for (const row of rows) resolveExactImportTopic(topics, idx.topic !== -1 ? row[idx.topic] : "");

  const fileHash = crypto.createHash("sha256").update(content).digest("hex");
  const tempJobId = crypto.randomUUID();
  const [previousJob] = await sql`SELECT id FROM admin_import_jobs WHERE actor_id=${ACTOR_ID}::uuid AND file_hash=${fileHash}`;
  if(previousJob) throw new Error("This legacy importer cannot safely resume historical receipts. Use the reviewed admin import workflow instead.");

  // Create admin import job
  const [job] = await sql`
    INSERT INTO admin_import_jobs (
      id, actor_id, file_hash, total_rows, completed_rows, completed_batches, status, created_at, updated_at
    ) VALUES (
      ${tempJobId}::uuid, ${ACTOR_ID}::uuid, ${fileHash}, ${rows.length}, 0, 0, 'in_progress', NOW(), NOW()
    ) ON CONFLICT (actor_id, file_hash) DO UPDATE SET status = 'in_progress', updated_at = NOW() RETURNING id
  `;
  const jobId = job.id;
  console.log(`Created admin import job: ${jobId}`);

  const BATCH_SIZE = 10;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  let totalImported = 0;

  const existingRefs = new Set(
    (await sql`SELECT external_reference FROM question_import_references WHERE subject_id = ${subjectId}`).map(r => r.external_reference)
  );
  console.log(`Found ${existingRefs.size} already existing questions in DB for ${subjectCode}. Skipping duplicates.`);

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const batchRows = rows.slice(startIdx, startIdx + BATCH_SIZE);
    const batchIndex = b;
    const batchHash = crypto.createHash("sha256").update(`${jobId}-${batchIndex}-${batchRows.length}`).digest("hex");

    let batchImported = 0;
    let batchSkipped = 0;
    await sql.begin(async (tx) => {
      for (const r of batchRows) {
        const year = parseInt(r[idx.year], 10) || null;
        const qNum = parseInt(r[idx.qnum], 10) || 1;
        const qText = r[idx.qtext].trim();
        const optA = r[idx.oa].trim();
        const optB = r[idx.ob].trim();
        const optC = r[idx.oc].trim();
        const optD = r[idx.od].trim();
        const correctOpt = r[idx.ans].trim().toUpperCase();
        const explanation = r[idx.exp].trim();
        const topicName = idx.topic !== -1 ? r[idx.topic].trim() : "General";

        const extRef = `${subjectCode}-${year}-${String(qNum).padStart(3, '0')}`;
        if (existingRefs.has(extRef)) {
          batchSkipped++;
          continue;
        }
        existingRefs.add(extRef);

        const topicId = resolveExactImportTopic(topics, topicName);
        const questionId = crypto.randomUUID();

        // 1. Insert question
        await tx`
          INSERT INTO questions (
            id, subject_id, topic_id, stem, difficulty, exam_year, status, editorial_revision, created_at
          ) VALUES (
            ${questionId}::uuid, ${subjectId}::uuid, ${topicId}::uuid, ${qText}, 'medium', ${year}, 'published', 1, NOW()
          )
        `;

        // 2. Insert options
        const optionsData = [
          { label: "A", content: optA, isCorrect: correctOpt === "A" },
          { label: "B", content: optB, isCorrect: correctOpt === "B" },
          { label: "C", content: optC, isCorrect: correctOpt === "C" },
          { label: "D", content: optD, isCorrect: correctOpt === "D" }
        ];

        const optionRecords = [];
        for (const opt of optionsData) {
          const optId = crypto.randomUUID();
          await tx`
            INSERT INTO question_options (
              id, question_id, label, content, is_correct
            ) VALUES (
              ${optId}::uuid, ${questionId}::uuid, ${opt.label}, ${opt.content}, ${opt.isCorrect}
            )
          `;
          optionRecords.push({
            id: optId,
            question_id: questionId,
            label: opt.label,
            content: opt.content,
            is_correct: opt.isCorrect
          });
        }

        // 3. Insert explanation
        await tx`
          INSERT INTO question_explanations (
            id, question_id, explanation, verified_by, created_at
          ) VALUES (
            ${crypto.randomUUID()}::uuid, ${questionId}::uuid, ${explanation}, ${ACTOR_ID}::uuid, NOW()
          )
        `;

        // 4. Insert metadata
        const tags = [subjectCode.toLowerCase(), "utme", "past_questions", topicName.toLowerCase()];
        await tx`
          INSERT INTO question_editorial_metadata (
            question_id, source_type, source_reference, rights_note, image_alt, tags
          ) VALUES (
            ${questionId}::uuid, 'past_question', ${`UTME ${year} ${subject.name} Examination`}, 'Educational examination archive', '', ${tx.json(tags)}
          )
        `;

        // 5. Insert history
        const snapshot = {
          question: {
            id: questionId,
            subject_id: subjectId,
            topic_id: topicId,
            stem: qText,
            difficulty: "medium",
            exam_year: year,
            status: "published",
            editorial_revision: 1
          },
          options: optionRecords,
          explanation,
          metadata: {
            source_type: "past_question",
            source_reference: `UTME ${year} ${subject.name} Examination`,
            rights_note: 'Educational examination archive',
            tags
          }
        };

        await tx`
          INSERT INTO question_editorial_history (
            id, question_id, revision, actor_id, action, snapshot, created_at
          ) VALUES (
            ${crypto.randomUUID()}::uuid, ${questionId}::uuid, 1, ${ACTOR_ID}::uuid, 'question.imported', ${tx.json(snapshot)}, NOW()
          )
        `;

        // 6. Insert import reference
        const reqHash = crypto.createHash("sha256").update(extRef).digest("hex");
        await tx`
          INSERT INTO question_import_references (
            subject_id, external_reference, question_id, request_hash
          ) VALUES (
            ${subjectId}::uuid, ${extRef}, ${questionId}::uuid, ${reqHash}
          )
        `;

        // 7. Insert audit event
        await tx`
          INSERT INTO admin_audit_events (
            id, actor_id, action, entity_id, details, created_at
          ) VALUES (
            ${crypto.randomUUID()}::uuid, ${ACTOR_ID}::uuid, 'question.imported', ${questionId}::uuid, ${tx.json({ external_reference: extRef, subject_code: subjectCode })}, NOW()
          )
        `;

        batchImported++;
      }

      // Record batch completion
      await tx`
        INSERT INTO admin_import_batches (
          job_id, batch_index, request_hash, imported_count, skipped_count, created_at
        ) VALUES (
          ${job.id}::uuid, ${batchIndex}, ${batchHash}, ${batchImported}, ${batchSkipped}, NOW()
        ) ON CONFLICT (job_id, batch_index) DO UPDATE SET imported_count = EXCLUDED.imported_count, request_hash = EXCLUDED.request_hash
      `;

      await tx`
        UPDATE admin_import_jobs
        SET completed_rows = ${startIdx + batchRows.length},
            completed_batches = ${batchIndex + 1},
            updated_at = NOW()
        WHERE id = ${job.id}::uuid
      `;
    });

    totalImported += batchImported;
    console.log(`[Batch ${b + 1}/${totalBatches}] Committed ${batchImported}; skipped ${batchSkipped}.`);
  }

  await sql`
    UPDATE admin_import_jobs
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = ${job.id}::uuid
  `;

  const [countRes] = await sql`
    SELECT COUNT(id) as total FROM questions WHERE subject_id = ${subjectId}
  `;

  console.log(`\nProcessed ${rows.length} rows; inserted ${totalImported}; skipped ${rows.length-totalImported}.`);
  console.log(`Updated ${subjectCode} questions total in database: ${countRes.total}`);
  await sql.end();
}

run().catch((err) => {
  console.error("Upload error:", err);
  process.exit(1);
});
