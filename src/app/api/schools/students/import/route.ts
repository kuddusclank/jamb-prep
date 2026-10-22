import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/db";
import { profiles, schools, schoolMembers, schoolStudents } from "@/db/schema";
import { eq } from "drizzle-orm";

function computeDefaultPassword(lastName: string): string {
  const clean = lastName.trim().toUpperCase();
  if (clean.length >= 6) return clean;
  return `${clean}123456`.slice(0, 6);
}

interface RawImportItem {
  firstName?: string;
  lastName?: string;
  email?: string;
  studentIdentifier?: string;
  phone?: string;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const role = user.user_metadata?.role;
    if (role === "student") {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const body = await request.json();
    const items = (body.students as RawImportItem[]) || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No student records provided. Please provide an array of students." },
        { status: 400 }
      );
    }

    if (items.length > 500) {
      return NextResponse.json(
        { error: "Batch size exceeds 500 students. Please upload in batches of 500 or fewer." },
        { status: 400 }
      );
    }

    // Resolve School Tenant
    let school = await db.query.schools.findFirst({
      where: eq(schools.adminId, user.id),
    });

    if (!school) {
      const membership = await db.query.schoolMembers.findFirst({
        where: eq(schoolMembers.userId, user.id),
      });
      if (membership) {
        school = await db.query.schools.findFirst({
          where: eq(schools.id, membership.schoolId),
        });
      }
    }

    const schoolId = school?.id || user.id;
    const schoolCode = school?.code || (user.user_metadata?.school_code as string) || "SCH-INSTITUTION";
    const adminClient = createAdminClient();

    let importedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; email?: string; reason: string }> = [];
    const roster: Array<{
      id: string;
      name: string;
      firstName: string;
      lastName: string;
      email: string;
      defaultPassword: string;
      studentIdentifier: string | null;
      status: "imported" | "duplicate";
    }> = [];

    const seenEmails = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const rowNum = i + 1;
      const item = items[i];
      const firstName = (item.firstName || "").trim();
      const lastName = (item.lastName || "").trim();
      const email = (item.email || "").trim().toLowerCase();
      const studentIdentifier = (item.studentIdentifier || "").trim() || null;
      const phone = (item.phone || "").trim() || null;

      if (!firstName || !lastName) {
        errors.push({ row: rowNum, email, reason: "Missing first name or last name." });
        skippedCount++;
        continue;
      }

      if (!email || !email.includes("@")) {
        errors.push({ row: rowNum, email, reason: "Invalid email address format." });
        skippedCount++;
        continue;
      }

      if (seenEmails.has(email)) {
        errors.push({ row: rowNum, email, reason: "Duplicate email within uploaded batch." });
        skippedCount++;
        continue;
      }
      seenEmails.add(email);

      const fullName = `${firstName} ${lastName}`;
      const defaultPassword = computeDefaultPassword(lastName);
      let studentUserId: string = "";
      let isDuplicate = false;

      if (adminClient) {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            role: "student",
            display_name: fullName,
            first_name: firstName,
            last_name: lastName,
            school_id: schoolId,
            school_code: schoolCode,
            phone,
          },
        });

        if (createError) {
          const msg = createError.message.toLowerCase();
          if (msg.includes("already registered") || msg.includes("already exists")) {
            isDuplicate = true;
            const existing = await db.query.profiles.findFirst({
              where: eq(profiles.email, email),
            });
            if (existing) {
              studentUserId = existing.id;
            } else {
              studentUserId = "std-dup-" + i;
            }
          } else {
            errors.push({ row: rowNum, email, reason: createError.message });
            skippedCount++;
            continue;
          }
        } else if (created.user) {
          studentUserId = created.user.id;
        }
      } else {
        studentUserId = "std-" + Math.random().toString(36).substring(2, 9);
      }

      try {
        await db
          .insert(profiles)
          .values({
            id: studentUserId,
            displayName: fullName,
            email,
            role: "student",
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: { displayName: fullName },
          });

        if (school?.id) {
          await db
            .insert(schoolStudents)
            .values({
              schoolId: school.id,
              studentUserId,
              studentIdentifier,
              ingestionMethod: "csv",
              licenseStatus: "inactive",
            })
            .onConflictDoNothing();
        }
      } catch (dbErr) {
        console.warn(`Database insert notice on row ${rowNum}:`, dbErr);
      }

      importedCount++;
      roster.push({
        id: studentUserId,
        name: fullName,
        firstName,
        lastName,
        email,
        defaultPassword,
        studentIdentifier,
        status: isDuplicate ? "duplicate" : "imported",
      });
    }

    return NextResponse.json({
      success: true,
      totalReceived: items.length,
      importedCount,
      skippedCount,
      errors,
      roster,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
