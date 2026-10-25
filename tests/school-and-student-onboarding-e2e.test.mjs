import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();

// Register hooks to transpile TypeScript worker files seamlessly under node:test
registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier) && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const tsCandidate = path.resolve(parentDir, specifier + ".ts");
      if (fs.existsSync(tsCandidate)) {
        return nextResolve(pathToFileURL(tsCandidate).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: fileURLToPath(url),
      });
      return { format: "module", shortCircuit: true, source: outputText };
    }
    return nextLoad(url, context);
  },
});

test("E2E School & Student Onboarding: Comprehensive Production Workflow Audit", async (t) => {
  const { SCHOOL_ROUTES, resolveCallerSchool } = await import("../worker/services/school-routes.ts");
  const { provisionStudentAccountAtomic } = await import("../worker/services/auth-provisioning-service.ts");
  const { settleSchoolOrderFromWebhook } = await import("../worker/services/school-routes.ts");
  const { PRACTICE_ROUTES } = await import("../worker/services/practice-routes.ts");

  // Helper to create mock request contexts
  function createCtx({
    method = "GET",
    pathname = "/api/v1/schools/students",
    body = null,
    actor = null,
    db = null,
  }) {
    const headers = { "Content-Type": "application/json" };
    if (actor) {
      headers["Authorization"] = `Bearer mock-token-${actor.userId}`;
    }
    const request = new Request(`https://jambprep.pages.dev${pathname}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      request,
      env: {
        PUBLIC_APP_ORIGIN: "https://jambprep.lecterniq.com",
        PAYSTACK_SECRET_KEY: "sk_live_dummy_test_e2e",
      },
      actor: actor || {
        userId: "11111111-1111-4111-a111-111111111111",
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: {
          user_metadata: {
            role: "school_admin",
            school_name: "Apex International College",
            school_code: "SCH-APEX2026",
            state: "Oyo",
          },
        },
      },
      getDb: () => db,
    };
  }

  // --- 1. SCHOOL REGISTRATION & INITIAL LIFECYCLE ---
  await t.test("1.1 School Admin Registration: Provisions school, profile, and owner member", async () => {
    const registerRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.register.post");
    assert.ok(registerRoute, "Expected schools.register.post route to exist");

    let insertedSchool = null;
    let insertedMember = null;
    let updatedProfile = null;

    const mockAdminId = "a1111111-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const mockDb = {
      sql: async (strings, ...values) => {
        const q = strings.join("?");
        if (/SELECT\s+id\s+FROM\s+school_students/i.test(q)) {
          return []; // Caller is not an enrolled student
        }
        if (/INSERT\s+INTO\s+profiles/i.test(q)) {
          updatedProfile = { id: values[0], display_name: values[1], email: values[2], role: "school_admin" };
          return [];
        }
        if (/INSERT\s+INTO\s+schools/i.test(q)) {
          insertedSchool = {
            id: "22222222-2222-4222-a222-222222222222",
            name: values[0],
            slug: values[1],
            code: values[2],
            type: values[3],
            state: values[4],
            admin_id: values[5],
          };
          return [insertedSchool];
        }
        if (/INSERT\s+INTO\s+school_members/i.test(q)) {
          insertedMember = { school_id: values[0], user_id: values[1], role: "owner" };
          return [];
        }
        if (/UPDATE\s+auth\.users/i.test(q)) {
          return [];
        }
        return [];
      },
    };

    const ctx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/register",
      body: {
        schoolName: "Apex International College",
        schoolCode: "SCH-APEX2026",
        schoolType: "secondary_school",
        state: "Oyo",
        adminName: "Mrs. Folashade Adeleke",
      },
      actor: {
        userId: mockAdminId,
        email: "adeleke@apexschool.ng",
        role: "authenticated",
        claims: { user_metadata: { role: "school_admin" } },
      },
      db: mockDb,
    });

    const res = await registerRoute.handler(ctx);
    assert.equal(res.status, 200);
    assert.equal(res.body.school.name, "Apex International College");
    assert.equal(res.body.school.code, "SCH-APEX2026");
    assert.equal(res.body.school.state, "Oyo");
    assert.equal(insertedMember.role, "owner");
    assert.equal(updatedProfile.role, "school_admin");
  });

  await t.test("1.2 Student Escalation Guard: Students and candidates cannot register schools", async () => {
    const registerRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.register.post");

    // Case A: Account metadata declares role = student
    await assert.rejects(
      () =>
        registerRoute.handler(
          createCtx({
            method: "POST",
            pathname: "/api/v1/schools/register",
            body: { schoolName: "Fake Academy" },
            actor: {
              userId: "88888888-8888-4888-8888-888888888888",
              email: "student@test.ng",
              role: "student",
              claims: { user_metadata: { role: "student" } },
            },
            db: { sql: async () => [] },
          })
        ),
      (err) => err.status === 403 && err.code === "FORBIDDEN"
    );

    // Case B: Account exists in school_students table as an enrolled candidate
    await assert.rejects(
      () =>
        registerRoute.handler(
          createCtx({
            method: "POST",
            pathname: "/api/v1/schools/register",
            body: { schoolName: "Fake Academy" },
            actor: {
              userId: "99999999-9999-4999-9999-999999999999",
              email: "cand@test.ng",
              role: "authenticated",
              claims: {},
            },
            db: {
              sql: async (strings) => {
                const q = strings.join("?");
                if (/FROM\s+school_students/i.test(q)) return [{ id: "enrolled-1" }];
                return [];
              },
            },
          })
        ),
      (err) => err.status === 403 && err.code === "FORBIDDEN"
    );
  });

  await t.test("1.3 Dashboard Auto-Provisioning via resolveCallerSchool", async () => {
    // When a school admin lands on the dashboard after Supabase auth,
    // resolveCallerSchool seamlessly creates school & owner records if eager register was interrupted
    const adminId = "a3333333-3333-4333-a333-333333333333";
    let autoCreated = false;

    const db = {
      sql: async (strings, ...values) => {
        const q = strings.join("?");
        if (/SELECT\s+s\.id.*FROM\s+schools\s+s/i.test(q)) {
          if (!autoCreated) return []; // First lookup: not yet in table
          return [
            {
              id: "school-auto-1",
              name: "Apex International College",
              code: "SCH-APEX2026",
              type: "secondary_school",
              state: "Oyo",
              admin_id: adminId,
            },
          ];
        }
        if (/SELECT\s+id\s+FROM\s+school_students/i.test(q)) {
          return [];
        }
        if (/INSERT\s+INTO\s+profiles/i.test(q)) {
          return [];
        }
        if (/INSERT\s+INTO\s+schools/i.test(q)) {
          autoCreated = true;
          return [
            {
              id: "school-auto-1",
              name: values[0],
              code: values[2],
              type: values[3],
              state: values[4],
              admin_id: values[5],
            },
          ];
        }
        if (/INSERT\s+INTO\s+school_members/i.test(q)) {
          return [];
        }
        return [];
      },
    };

    const resolved = await resolveCallerSchool(
      {
        userId: adminId,
        email: "admin@apexschool.ng",
        claims: {
          user_metadata: {
            role: "school_admin",
            school_name: "Apex International College",
            school_code: "SCH-APEX2026",
            school_type: "secondary_school",
            state: "Oyo",
          },
        },
      },
      db,
      { autoProvision: true }
    );

    assert.ok(resolved, "Expected school to be auto-provisioned");
    assert.equal(resolved.code, "SCH-APEX2026");
    assert.equal(resolved.name, "Apex International College");
  });

  // --- 2. STUDENT ONBOARDING PATHWAYS ---
  const schoolRecord = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Apex International College",
    code: "SCH-APEX2026",
    type: "secondary_school",
    state: "Oyo",
    admin_id: "a1111111-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  };

  await t.test("2.1 Manual Single Candidate Ingestion: Default password = uppercase surname", async () => {
    const studentsPostRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.post");
    assert.ok(studentsPostRoute);

    let insertedAuthUser = null;
    let insertedSchoolStudent = null;
    let insertedSubjects = [];

    const db = {
      sql: async (strings) => {
        const q = strings.join("?");
        if (/FROM\s+schools\s+s/i.test(q)) return [schoolRecord];
        return [];
      },
      runCommittedTransaction: async (cb) => {
        const txSql = async (strings, ...values) => {
          const q = strings.join("?");
          if (/FROM\s+auth\.users\s+u/i.test(q)) return []; // New student
          if (/FROM\s+subjects/i.test(q)) {
            return [
              { id: "sub-eng", code: "ENG" },
              { id: "sub-mth", code: "MTH" },
              { id: "sub-phy", code: "PHY" },
              { id: "sub-chm", code: "CHM" },
            ];
          }
          if (/INSERT\s+INTO\s+auth\.users/i.test(q)) {
            insertedAuthUser = {
              email: values[2],
              authPassword: values[3],
              rawUserMetadata: values[6],
            };
            return [];
          }
          if (/INSERT\s+INTO\s+auth\.identities/i.test(q)) return [];
          if (/INSERT\s+INTO\s+profiles/i.test(q)) return [];
          if (/INSERT\s+INTO\s+school_students/i.test(q)) {
            insertedSchoolStudent = {
              school_id: values[0],
              student_user_id: values[1],
              student_identifier: values[2],
              ingestion_method: values[3],
              license_status: "inactive",
            };
            return [{ id: "ss-rec-001", created_at: new Date().toISOString() }];
          }
          if (/INSERT\s+INTO\s+student_subjects/i.test(q)) {
            insertedSubjects.push(values);
            return [];
          }
          if (/INSERT\s+INTO\s+student_preferences/i.test(q)) return [];
          return [];
        };
        return cb(txSql);
      },
    };

    const ctx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/students",
      body: {
        firstName: "Babajide",
        lastName: "Sanwo",
        email: "b.sanwo@apexschool.ng",
        studentIdentifier: "APEX-2026-001",
        ingestionMethod: "manual",
        subjects: ["ENG", "MTH", "PHY", "CHM"],
      },
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });

    const res = await studentsPostRoute.handler(ctx);
    assert.equal(res.status, 200);
    assert.equal(res.body.students.length, 1);

    const cand = res.body.students[0];
    assert.equal(cand.name, "Babajide Sanwo");
    assert.equal(cand.email, "b.sanwo@apexschool.ng");
    assert.equal(cand.defaultPassword, "SANWO", "Default password must be exact uppercase surname");
    assert.equal(cand.licenseStatus, "inactive");
    assert.equal(cand.ingestionMethod, "manual");
    assert.deepEqual(cand.subjects, ["ENG", "MTH", "PHY", "CHM"]);
    assert.equal(insertedSchoolStudent.ingestion_method, "manual");
  });

  await t.test("2.2 CSV Batch Import: Multi-candidate ingestion with conflict skipping", async () => {
    const studentsPostRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.post");

    const batchStudents = [
      { firstName: "Chinedu", lastName: "Okonkwo", email: "c.okonkwo@apexschool.ng", studentIdentifier: "ST-101" },
      { firstName: "Amina", lastName: "Bello", email: "a.bello@apexschool.ng", studentIdentifier: "ST-102" },
      { firstName: "David", lastName: "Adeleke", email: "d.adeleke@apexschool.ng", studentIdentifier: "ST-103" },
      // Conflicting candidate: already enrolled in another school
      { firstName: "Fatima", lastName: "Danjuma", email: "f.danjuma@other.ng", studentIdentifier: "ST-104" },
      // Invalid admin account: cannot be enrolled as candidate
      { firstName: "Platform", lastName: "Admin", email: "superadmin@jambprep.ng", studentIdentifier: "ST-105" },
    ];

    const db = {
      sql: async (strings) => {
        const q = strings.join("?");
        if (/FROM\s+schools\s+s/i.test(q)) return [schoolRecord];
        return [];
      },
      runCommittedTransaction: async (cb) => {
        const txSql = async (strings, ...values) => {
          const q = strings.join("?");
          if (/FROM\s+auth\.users\s+u/i.test(q)) {
            const checkEmail = values.find((v) => typeof v === "string" && v.includes("@"));
            if (checkEmail === "f.danjuma@other.ng") {
              return [{ id: "user-fatima", meta_role: "student", profile_role: "student", other_school_id: "other-school-uuid" }];
            }
            if (checkEmail === "superadmin@jambprep.ng") {
              return [{ id: "user-admin", meta_role: "admin", profile_role: "admin", other_school_id: null }];
            }
            return [];
          }
          if (/INSERT\s+INTO\s+auth\.users/i.test(q)) return [];
          if (/INSERT\s+INTO\s+auth\.identities/i.test(q)) return [];
          if (/INSERT\s+INTO\s+profiles/i.test(q)) return [];
          if (/INSERT\s+INTO\s+school_students/i.test(q)) {
            return [{ id: `ss-batch-${values[2]}`, created_at: new Date().toISOString() }];
          }
          return [];
        };
        return cb(txSql);
      },
    };

    const ctx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/students",
      body: {
        ingestionMethod: "csv",
        students: batchStudents,
      },
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });

    const res = await studentsPostRoute.handler(ctx);
    assert.equal(res.status, 200);
    assert.equal(res.body.students.length, 3, "Expected 3 valid candidates enrolled");
    assert.equal(res.body.skippedCount, 2, "Expected 2 conflicting candidates skipped");

    assert.equal(res.body.students[0].defaultPassword, "OKONKWO");
    assert.equal(res.body.students[1].defaultPassword, "BELLO");
    assert.equal(res.body.students[2].defaultPassword, "ADELEKE");

    const skippedReasons = res.body.skipped;
    assert.ok(skippedReasons.some((s) => s.email === "f.danjuma@other.ng" && s.reason.includes("another school")));
    assert.ok(skippedReasons.some((s) => s.email === "superadmin@jambprep.ng" && s.reason.includes("administrator")));
  });

  await t.test("2.3 School Invite Link Bridge: Independent registration binds to school", async () => {
    let insertedLinkStudent = null;

    const dbTx = async (strings, ...values) => {
      const q = strings.join("?");
      if (/INSERT\s+INTO\s+profiles/i.test(q)) {
        return [{ id: values[0], display_name: values[1], email: values[2], role: "student" }];
      }
      if (/SELECT\s+id,\s+display_name.*FROM\s+profiles/i.test(q)) {
        return [{ id: "c0000000-0000-4000-a000-000000000001", display_name: "Emeka Okafor", email: "selfregistered@gmail.com", role: "student" }];
      }
      if (/FROM\s+referral_codes/i.test(q)) {
        return [{ code: "EMEK1234" }];
      }
      if (/INSERT\s+INTO\s+referral_codes/i.test(q)) {
        return [{ code: "EMEK1234" }];
      }
      if (/SELECT\s+referral_code\s+FROM\s+profiles/i.test(q)) return [];
      if (/UPDATE\s+profiles\s+SET\s+referral_code/i.test(q)) return [];
      if (/SELECT\s+id\s+FROM\s+schools/i.test(q)) {
        // Referral code matches school code
        return [{ id: schoolRecord.id }];
      }
      if (/SELECT\s+school_id\s+FROM\s+school_students/i.test(q)) {
        return []; // Not yet enrolled
      }
      if (/INSERT\s+INTO\s+school_students/i.test(q)) {
        insertedLinkStudent = {
          school_id: values[0],
          student_user_id: values[1],
          ingestion_method: "link",
          license_status: "inactive",
        };
        return [];
      }
      return [];
    };

    const provResult = await provisionStudentAccountAtomic(
      dbTx,
      {
        userId: "c0000000-0000-4000-a000-000000000001",
        email: "selfregistered@gmail.com",
        displayName: "Emeka Okafor",
        referralCode: "SCH-APEX2026", // Candidate entered or clicked ?school=SCH-APEX2026
      },
      new Date()
    );

    assert.equal(provResult.referralAttribution, "pending");
    assert.equal(insertedLinkStudent.school_id, schoolRecord.id);
    assert.equal(insertedLinkStudent.ingestion_method, "link");
    assert.equal(insertedLinkStudent.license_status, "inactive");
  });

  await t.test("2.4 Student Invite Link Protection: Refuses to overwrite existing school affiliation", async () => {
    const existingSchoolId = "00000000-0000-4000-9999-000000000002";
    let insertedAttempt = false;

    const dbTx = async (strings, ...values) => {
      const q = strings.join("?");
      if (/INSERT\s+INTO\s+profiles/i.test(q)) {
        return [{ id: values[0], display_name: values[1], email: values[2], role: "student" }];
      }
      if (/SELECT\s+id,\s+display_name.*FROM\s+profiles/i.test(q)) {
        return [{ id: "c0000000-0000-4000-a000-000000000002", display_name: "Locked Student", email: "locked@gmail.com", role: "student" }];
      }
      if (/FROM\s+referral_codes/i.test(q)) {
        return [{ code: "LOCK1234" }];
      }
      if (/INSERT\s+INTO\s+referral_codes/i.test(q)) {
        return [{ code: "LOCK1234" }];
      }
      if (/SELECT\s+referral_code\s+FROM\s+profiles/i.test(q)) return [];
      if (/UPDATE\s+profiles\s+SET\s+referral_code/i.test(q)) return [];
      if (/SELECT\s+id\s+FROM\s+schools/i.test(q)) {
        return [{ id: schoolRecord.id }];
      }
      if (/SELECT\s+school_id\s+FROM\s+school_students/i.test(q)) {
        // Candidate is already enrolled under another school
        return [{ school_id: existingSchoolId }];
      }
      if (/INSERT\s+INTO\s+school_students/i.test(q)) {
        insertedAttempt = true;
        return [];
      }
      return [];
    };

    const provResult = await provisionStudentAccountAtomic(
      dbTx,
      {
        userId: "c0000000-0000-4000-a000-000000000002",
        email: "locked@gmail.com",
        displayName: "Locked Student",
        referralCode: "SCH-APEX2026",
      },
      new Date()
    );

    assert.equal(provResult.referralAttribution, "already_attributed");
    assert.equal(insertedAttempt, false, "Must not alter school_students row for candidate already enrolled elsewhere");
  });

  // --- 3. ROSTER FETCH & CREDENTIALS SLIP TRANSPARENCY ---
  await t.test("3.1 Roster Transparency: Shows default password for manual/CSV, hides for customized/link", async () => {
    const studentsGetRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.get");
    assert.ok(studentsGetRoute);

    const enrolledStudents = [
      {
        id: "ss-1",
        student_user_id: "user-1",
        name: "Babajide Sanwo",
        email: "b.sanwo@apexschool.ng",
        student_identifier: "APEX-001",
        ingestion_method: "manual",
        license_status: "inactive",
        license_expires_at: null,
        custom_password_set: false,
        custom_default_password: null,
        subjects: ["ENG", "MTH", "PHY", "CHM"],
        mock_avg_score: 245,
        practice_accuracy: 72,
        total_practice_questions: 150,
        created_at: new Date().toISOString(),
      },
      {
        id: "ss-2",
        student_user_id: "user-2",
        name: "Emeka Okafor",
        email: "emeka@gmail.com",
        student_identifier: null,
        ingestion_method: "link", // Registered independently via link bridge
        license_status: "inactive",
        license_expires_at: null,
        custom_password_set: false,
        custom_default_password: null,
        subjects: ["ENG", "ECN", "GOV", "LIT"],
        mock_avg_score: null,
        practice_accuracy: null,
        total_practice_questions: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: "ss-3",
        student_user_id: "user-3",
        name: "Chinedu Okonkwo",
        email: "c.okonkwo@apexschool.ng",
        student_identifier: "ST-101",
        ingestion_method: "csv",
        license_status: "active",
        license_expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        custom_password_set: true, // Candidate signed in and personalized password
        custom_default_password: null,
        subjects: ["ENG", "MTH", "BIO", "CHM"],
        mock_avg_score: 280,
        practice_accuracy: 85,
        total_practice_questions: 320,
        created_at: new Date().toISOString(),
      },
    ];

    const db = {
      sql: async (strings) => {
        const q = strings.join("?");
        if (/FROM\s+schools\s+s/i.test(q)) return [schoolRecord];
        if (/FROM\s+school_students\s+ss/i.test(q)) return enrolledStudents;
        return [];
      },
    };

    const ctx = createCtx({
      method: "GET",
      pathname: "/api/v1/schools/students",
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });

    const res = await studentsGetRoute.handler(ctx);
    assert.equal(res.status, 200);
    assert.equal(res.body.students.length, 3);

    // Candidate 1: Manual ingestion, uncustomized -> shows SANWO
    assert.equal(res.body.students[0].defaultPassword, "SANWO");
    // Candidate 2: Link bridge ingestion -> shows null (candidate chose their own password)
    assert.equal(res.body.students[1].defaultPassword, null);
    // Candidate 3: CSV ingestion, but customized their password on profile -> shows null
    assert.equal(res.body.students[2].defaultPassword, null);
  });

  // --- 4. COHORT LICENSING & CHECKOUT VERIFICATION ---
  await t.test("4.1 Cohort Checkout & Activation: Settle order and activates candidates", async () => {
    let orderStatusUpdated = false;

    const orderRecord = {
      id: "00000000-0000-4000-b000-000000000001",
      school_id: schoolRecord.id,
      reference: "SCH-APEX-ORD-12345",
      student_count: 2,
      duration_months: 3,
      total_amount_kobo: 900000,
      status: "pending",
      metadata: { studentIds: ["00000000-0000-4000-c000-000000000001", "00000000-0000-4000-c000-000000000002"] },
      paid_at: null,
    };

    const db = {
      sql: async (strings, ...values) => {
        const q = strings.join("?");
        if (/FROM\s+school_orders/i.test(q)) {
          return [orderRecord];
        }
        if (/INSERT\s+INTO\s+school_activation_jobs/i.test(q)) {
          return [{ id: "job-1", status: "queued" }];
        }
        if (/FROM\s+school_activation_jobs/i.test(q)) {
          if (/status\s+IN\s+\('queued'/i.test(q)) {
            return [
              { id: "job-1", student_user_id: "00000000-0000-4000-c000-000000000001", retry_count: 0 },
              { id: "job-2", student_user_id: "00000000-0000-4000-c000-000000000002", retry_count: 0 },
            ];
          }
          if (/GROUP\s+BY\s+status/i.test(q)) {
            return [{ status: "completed", count: 2 }];
          }
          return [];
        }
        if (/UPDATE\s+school_activation_jobs/i.test(q)) {
          return [];
        }
        if (/UPDATE\s+school_orders\s+SET\s+status\s*=\s*'completed'/i.test(q)) {
          orderStatusUpdated = true;
          return [{ id: orderRecord.id }];
        }
        if (/UPDATE\s+school_students\s+SET\s+license_status\s*=\s*'active'/i.test(q)) {
          return [];
        }
        if (/INSERT\s+INTO\s+subscription_entitlements/i.test(q)) {
          return [];
        }
        return [];
      },
    };

    const settleResult = await settleSchoolOrderFromWebhook(db, "SCH-APEX-ORD-12345", 900000);
    assert.equal(settleResult.handled, true);
    assert.equal(settleResult.orderId, orderRecord.id);
    assert.equal(orderStatusUpdated, true, "Order must transition to completed upon payment settlement");
  });

  // --- 5. CBT COMPUTER LAB MOCK SCHEDULING & JOIN ---
  await t.test("5.1 CBT Lab Mock: Scheduling and student room join validation", async () => {
    const scheduleRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.schedule");
    const joinRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.join");
    assert.ok(scheduleRoute);
    assert.ok(joinRoute);

    const activeLabMock = {
      labSessionCode: "LAB-APEX-XYZ9",
      title: "Inter-House CBT Diagnostic Simulation",
      scheduledDate: new Date(Date.now() - 60000).toISOString(), // Started 1 min ago
      durationMinutes: 120,
      totalQuestions: 180,
      hotkeyNavigationEnabled: true,
      status: "scheduled",
    };

    const db = {
      sql: async (strings, ...values) => {
        const q = strings.join("?");
        if (/FROM\s+schools\s+s/i.test(q) && /au\.raw_user_meta_data->'active_lab_mock'/i.test(q)) {
          const authActorId = values[0];
          if (authActorId === "cand-apex-01") {
            return [
              {
                school_id: schoolRecord.id,
                school_name: schoolRecord.name,
                school_code: schoolRecord.code,
                active_lab_mock: activeLabMock,
              },
            ];
          }
          // Candidate from different school returns empty (unauthorized)
          return [];
        }
        if (/FROM\s+schools\s+s/i.test(q)) return [schoolRecord];
        if (/UPDATE\s+auth\.users/i.test(q)) return [];
        return [];
      },
    };

    // Schedule mock
    const schedCtx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/mocks/schedule",
      body: {
        title: "Inter-House CBT Diagnostic Simulation",
        scheduledDate: new Date().toISOString(),
        durationMinutes: 120,
        totalQuestions: 180,
      },
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });

    const schedRes = await scheduleRoute.handler(schedCtx);
    assert.equal(schedRes.status, 200);
    assert.equal(schedRes.body.session.title, "Inter-House CBT Diagnostic Simulation");
    assert.ok(schedRes.body.session.labSessionCode.startsWith("LAB-"));

    // Enrolled student joins
    const joinCtx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/mocks/join",
      body: { labSessionCode: "LAB-APEX-XYZ9" },
      actor: {
        userId: "cand-apex-01",
        email: "b.sanwo@apexschool.ng",
        role: "student",
        claims: {},
      },
      db,
    });

    const joinRes = await joinRoute.handler(joinCtx);
    assert.equal(joinRes.status, 200);
    assert.equal(joinRes.body.session.title, "Inter-House CBT Diagnostic Simulation");

    // Outsider student joining Apex CBT Lab receives 404 NOT_FOUND
    const outsiderCtx = createCtx({
      method: "POST",
      pathname: "/api/v1/schools/mocks/join",
      body: { labSessionCode: "LAB-APEX-XYZ9" },
      actor: {
        userId: "outsider-student-99",
        email: "stranger@other.ng",
        role: "student",
        claims: {},
      },
      db,
    });

    await assert.rejects(
      () => joinRoute.handler(outsiderCtx),
      (err) => err.status === 404 && err.code === "NOT_FOUND"
    );
  });

  await t.test("5.2 CBT Lab Mock: Zero-Code Auto-Binding, Strict Lab Hours, and Privacy Rules", async () => {
    const scheduleRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.schedule");
    const activeMockRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.active.get");
    const endMockRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.end");
    const readinessRoute = PRACTICE_ROUTES.find((r) => r.id === "mock.readiness");

    assert.ok(scheduleRoute, "Schedule route must exist");
    assert.ok(activeMockRoute, "Active mock route must exist");
    assert.ok(endMockRoute, "End mock route must exist");
    assert.ok(readinessRoute, "Readiness route must exist");

    const schoolMockRecord = {
      id: "77777777-7777-4777-a777-777777777777",
      school_id: schoolRecord.id,
      title: "Senior Secondary UTME Lab Mock 1",
      scheduled_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago (open)
      duration_minutes: 120,
      question_count: 180,
      status: "active",
      window_buffer_minutes: 30,
      created_at: new Date().toISOString(),
    };

    let activeMocksTable = [schoolMockRecord];

    const enrolledStudentId = "cand-apex-01";

    const db = {
      sql: async (strings, ...values) => {
        const q = strings.join("?");

        // 1. Resolve school for admin
        if (/FROM\s+schools\s+s/i.test(q) && /admin_id/i.test(q)) {
          return [schoolRecord];
        }

        // 2. school_mocks queries
        if (/INSERT\s+INTO\s+school_mocks/i.test(q)) {
          const newMock = {
            id: "88888888-8888-4888-a888-888888888888",
            school_id: schoolRecord.id,
            title: values[1] || "Term UTME Mock",
            scheduled_start: values[2],
            duration_minutes: values[3],
            question_count: values[4],
            status: "active",
            window_buffer_minutes: values[5] || 30,
            created_at: new Date().toISOString(),
          };
          activeMocksTable = [newMock];
          return [newMock];
        }

        if (/UPDATE\s+school_mocks\s+SET\s+status\s*=\s*'completed'/i.test(q)) {
          activeMocksTable = [];
          return [{ ...schoolMockRecord, status: "completed" }];
        }

        if (/FROM\s+school_mocks/i.test(q)) {
          return activeMocksTable;
        }

        // 3. Student school affiliation check
        if (/FROM\s+school_students\s+ss\s+JOIN\s+schools/i.test(q)) {
          const studentUserId = values[0];
          if (studentUserId === enrolledStudentId) {
            return [
              {
                school_id: schoolRecord.id,
                school_name: schoolRecord.name,
                school_code: schoolRecord.code,
              },
            ];
          }
          return [];
        }

        // 4. Active mock leaderboard query
        if (/FROM\s+school_students\s+ss\s+JOIN\s+profiles/i.test(q)) {
          return [
            {
              student_user_id: "cand-apex-01",
              student_name: "Babajide Sanwo",
              student_email: "b.sanwo@apexschool.ng",
              student_identifier: "SCH-001",
              attempt_id: "att-001",
              attempt_status: "completed",
              started_at: new Date(Date.now() - 4000000).toISOString(),
              total_score: 312,
              english_score: 82,
              subject2_score: 78,
              subject3_score: 74,
              subject4_score: 78,
              time_spent_seconds: 5400,
              completed_at: new Date().toISOString(),
            },
            {
              student_user_id: "cand-apex-02",
              student_name: "Aminat Bello",
              student_email: "a.bello@apexschool.ng",
              student_identifier: "SCH-002",
              attempt_id: "att-002",
              attempt_status: "completed",
              started_at: new Date(Date.now() - 4000000).toISOString(),
              total_score: 285,
              english_score: 75,
              subject2_score: 70,
              subject3_score: 72,
              subject4_score: 68,
              time_spent_seconds: 6100,
              completed_at: new Date().toISOString(),
            },
          ];
        }

        // 5. Default empty returns for other queries (attempts, student_preferences, etc.)
        return [];
      },
    };

    // A. Enrolled student checks /api/v1/mock/readiness -> automatically detects school mock
    const studentReadinessCtx = createCtx({
      method: "GET",
      pathname: "/api/v1/mock/readiness",
      actor: {
        userId: enrolledStudentId,
        email: "b.sanwo@apexschool.ng",
        role: "student",
        claims: {},
      },
      db,
    });
    studentReadinessCtx.now = new Date();

    const readinessRes = await readinessRoute.handler(studentReadinessCtx);
    assert.equal(readinessRes.status, 200);
    assert.ok(readinessRes.body.schoolMock, "Expected schoolMock payload to be present for enrolled candidate");
    assert.equal(readinessRes.body.schoolMock.schoolName, schoolRecord.name);
    assert.equal(readinessRes.body.schoolMock.title, schoolMockRecord.title);
    assert.equal(readinessRes.body.schoolMock.windowStatus, "open");

    // CRITICAL PRIVACY RULE: Student payload MUST NOT expose class rankings or other students' scores
    assert.equal(readinessRes.body.schoolMock.leaderboard, undefined);
    assert.equal(readinessRes.body.schoolMock.rank, undefined);

    // B. School Admin fetches /api/v1/schools/mocks/active -> receives ranked leaderboard & KPIs
    const adminActiveMockCtx = createCtx({
      method: "GET",
      pathname: "/api/v1/schools/mocks/active",
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });
    adminActiveMockCtx.now = new Date();

    const activeRes = await activeMockRoute.handler(adminActiveMockCtx);
    assert.equal(activeRes.status, 200);
    assert.ok(activeRes.body.mock);
    assert.equal(activeRes.body.mock.title, schoolMockRecord.title);
    assert.equal(activeRes.body.summary.completedCount, 2);
    assert.equal(activeRes.body.summary.highestScore, 312);
    assert.equal(activeRes.body.summary.averageScore, 299);

    // Verify leaderboard is sorted by total_score descending with assigned ranks
    assert.equal(activeRes.body.leaderboard.length, 2);
    assert.equal(activeRes.body.leaderboard[0].rank, 1);
    assert.equal(activeRes.body.leaderboard[0].studentName, "Babajide Sanwo");
    assert.equal(activeRes.body.leaderboard[0].totalScore, 312);
    assert.equal(activeRes.body.leaderboard[1].rank, 2);
    assert.equal(activeRes.body.leaderboard[1].studentName, "Aminat Bello");
    assert.equal(activeRes.body.leaderboard[1].totalScore, 285);

    // C. School Admin ends mock session -> status transitions to completed
    const endCtx = createCtx({
      method: "POST",
      pathname: `/api/v1/schools/mocks/${schoolMockRecord.id}/end`,
      actor: {
        userId: schoolRecord.admin_id,
        email: "admin@apexschool.ng",
        role: "school_admin",
        claims: { user_metadata: { role: "school_admin", school_code: schoolRecord.code } },
      },
      db,
    });
    endCtx.params = { mockId: schoolMockRecord.id };
    endCtx.now = new Date();

    const endRes = await endMockRoute.handler(endCtx);
    assert.equal(endRes.status, 200);
    assert.equal(endRes.body.success, true);
    assert.ok(endRes.body.message.includes("concluded"));
  });
});
