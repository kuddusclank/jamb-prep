import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { db } from "@/db";
import { schools, schoolMembers, schoolStudents } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface DiagnosticTopicItem {
  id: string;
  subject: string;
  topic: string;
  accuracyRate: number; // percentage (0-100)
  questionsAttempted: number;
  status: "urgent_remedial" | "revision_recommended" | "exam_ready";
  recommendedAction: string;
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

    // High-yield syllabus topics across core Nigerian UTME curriculum
    const diagnosticTopics: DiagnosticTopicItem[] = [
      {
        id: "top-1",
        subject: "Chemistry",
        topic: "Organic Nomenclature & Functional Groups",
        accuracyRate: 32,
        questionsAttempted: 148,
        status: "urgent_remedial",
        recommendedAction: "Reteach IUPAC numbering rules for branched alkanes and carboxylic acids before Friday lab.",
      },
      {
        id: "top-2",
        subject: "Mathematics",
        topic: "Calculus: Differentiation & Curve Extrema",
        accuracyRate: 36,
        questionsAttempted: 160,
        status: "urgent_remedial",
        recommendedAction: "Focus Monday tutorial on product and quotient rules with past question drill.",
      },
      {
        id: "top-3",
        subject: "Use of English",
        topic: "Grammar: Subject-Verb Concord & Inversion",
        accuracyRate: 54,
        questionsAttempted: 220,
        status: "revision_recommended",
        recommendedAction: "Provide 20-question practice on indefinite pronouns and 'neither...nor' structures.",
      },
      {
        id: "top-4",
        subject: "Physics",
        topic: "Electric Fields, Capacitance & Dielectrics",
        accuracyRate: 48,
        questionsAttempted: 132,
        status: "revision_recommended",
        recommendedAction: "Review series/parallel capacitor energy storage calculations during revision period.",
      },
      {
        id: "top-5",
        subject: "Physics",
        topic: "Mechanics: Vectors & Projectile Motion",
        accuracyRate: 82,
        questionsAttempted: 195,
        status: "exam_ready",
        recommendedAction: "Cohort demonstrates firm mastery. Maintain retention with weekly speed drills.",
      },
      {
        id: "top-6",
        subject: "Biology",
        topic: "Genetics: Mendelian Inheritance & Blood Grouping",
        accuracyRate: 78,
        questionsAttempted: 210,
        status: "exam_ready",
        recommendedAction: "Exam ready. Reinforce sex-linked inheritance anomalies (haemophilia & colour blindness).",
      },
      {
        id: "top-7",
        subject: "Economics",
        topic: "Elasticity of Demand & Market Structures",
        accuracyRate: 64,
        questionsAttempted: 115,
        status: "revision_recommended",
        recommendedAction: "Differentiate between monopolistic competition and oligopoly price rigidity.",
      },
      {
        id: "top-8",
        subject: "Government",
        topic: "Constitutional Development (1922 Clifford to 1999)",
        accuracyRate: 74,
        questionsAttempted: 130,
        status: "exam_ready",
        recommendedAction: "Strong historical retention. Review key features of the 1979 Presidential Constitution.",
      },
    ];

    const urgentCount = diagnosticTopics.filter((t) => t.status === "urgent_remedial").length;
    const revisionCount = diagnosticTopics.filter((t) => t.status === "revision_recommended").length;
    const readyCount = diagnosticTopics.filter((t) => t.status === "exam_ready").length;

    const revisionTimetable = [
      { day: "Monday", time: "09:00 AM - 10:30 AM", subject: "Chemistry", topic: "Organic Nomenclature", priority: "Urgent" },
      { day: "Tuesday", time: "11:00 AM - 12:30 PM", subject: "Mathematics", topic: "Calculus & Curve Extrema", priority: "Urgent" },
      { day: "Wednesday", time: "10:00 AM - 11:15 AM", subject: "Use of English", topic: "Subject-Verb Concord", priority: "Revision" },
      { day: "Thursday", time: "02:00 PM - 03:30 PM", subject: "Physics", topic: "Capacitance & Dielectrics", priority: "Revision" },
      { day: "Friday", time: "09:30 AM - 11:30 AM", subject: "All Subjects", topic: "120-Min Synchronized CBT Lab Mock Simulation", priority: "Mock" },
    ];

    return NextResponse.json({
      success: true,
      schoolId,
      schoolName: school?.name || "Institutional Partner",
      stats: {
        totalTopicsTracked: diagnosticTopics.length,
        urgentRemedialCount: urgentCount,
        revisionRecommendedCount: revisionCount,
        examReadyCount: readyCount,
        cohortAverageAccuracy: 58.5,
      },
      topics: diagnosticTopics,
      revisionTimetable,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
