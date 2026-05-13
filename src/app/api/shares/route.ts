import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function derivePassword(email: string): string {
  const prefix = email.split("@")[0];
  if (prefix.length < 6) {
    throw new Error("Email prefix before '@' must be at least 6 characters for password generation");
  }
  return prefix;
}

export async function POST(request: Request) {
  try {
    const { doctorEmail, accessTables } = await request.json();
    if (!doctorEmail || !accessTables || !Array.isArray(accessTables) || accessTables.length === 0) {
      return NextResponse.json({ error: "doctorEmail and accessTables required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (doctorEmail === user.email) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }

    const admin = createAdminClient();
    const password = derivePassword(doctorEmail);

    // Check if doctor already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const doctorUser = existingUsers?.users.find((u) => u.email === doctorEmail);

    let doctorId: string;
    let isNew = false;

    if (doctorUser) {
      doctorId = doctorUser.id;
    } else {
      // Auto-create doctor account
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: doctorEmail,
        password,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json({ error: `Failed to create account: ${createError.message}` }, { status: 500 });
      }

      doctorId = newUser.user.id;
      isNew = true;

      // Create user_settings for doctor
      const { error: settingsError } = await admin
        .from("user_settings")
        .insert({ user_id: doctorId });

      if (settingsError) {
        return NextResponse.json({ error: `Failed to setup: ${settingsError.message}` }, { status: 500 });
      }

      // Assign doctor role
      const { error: roleError } = await admin
        .from("user_roles")
        .upsert({ user_id: doctorId, role: "doctor" }, { onConflict: "user_id" });

      if (roleError) {
        return NextResponse.json({ error: `Failed to assign role: ${roleError.message}` }, { status: 500 });
      }
    }

    // Create or update the share
    const { error: insertError } = await admin
      .from("shared_patients")
      .upsert(
        {
          doctor_id: doctorId,
          patient_id: user.id,
          access_tables: accessTables,
        },
        { onConflict: "doctor_id,patient_id" }
      );

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isNew,
      doctorEmail,
      password: isNew ? password : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: shares } = await admin
      .from("shared_patients")
      .select("*")
      .eq("patient_id", user.id);

    const doctorIds = [...new Set((shares ?? []).map((s) => s.doctor_id))];
    const { data: users } = await admin.auth.admin.listUsers();
    const emailMap = new Map(
      (users?.users ?? []).map((u) => [u.id, u.email])
    );

    const enriched = (shares ?? []).map((s) => ({
      ...s,
      email: emailMap.get(s.doctor_id) ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { shareId } = await request.json();
    if (!shareId) {
      return NextResponse.json({ error: "shareId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("shared_patients")
      .delete()
      .eq("id", shareId)
      .eq("patient_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
