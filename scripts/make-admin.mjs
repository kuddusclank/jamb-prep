import postgres from "postgres";

const email = process.argv[2];

if (!email) {
  console.log("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const connectionString = 
  process.env.TRANSACTION_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgresql://postgres.bqumnaoiiukifvanoonm:xuhsuc-0wavno-kygDyg@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

const sql = postgres(connectionString, { max: 1 });

try {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`
    UPDATE profiles 
    SET role = 'admin', updated_at = NOW() 
    WHERE LOWER(email) = ${normalizedEmail} 
    RETURNING id, display_name, email, role
  `;

  if (rows.length === 0) {
    console.log(`\n❌ No profile found for "${email}".`);
    console.log(`👉 Please sign up first at https://jambprep.lecterniq.com/register, then run this command again.\n`);
  } else {
    const profile = rows[0];
    console.log(`\n✅ Success! Account promoted to Admin:`);
    console.log(`   - Name:  ${profile.display_name}`);
    console.log(`   - Email: ${profile.email}`);
    console.log(`   - Role:  ${profile.role}\n`);
  }
} catch (err) {
  console.error("Error setting admin role:", err.message);
} finally {
  await sql.end();
}
