import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: doctorUser, error: lookupError } = await supabase
      .from("user_settings")
      .select("user_id, full_name")
      .eq("user_id", user.id)
      .single();

    const { data: doctor } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", doctorEmail)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found. They need to sign up first." }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from("shared_patients")
      .upsert(
        {
          doctor_id: doctor.id,
          patient_id: user.id,
          access_tables: accessTables,
        },
        { onConflict: "doctor_id,patient_id" }
      );

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
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

    const { data: shares, error } = await supabase
      .from("shared_patients")
      .select("*")
      .eq("patient_id", user.id);

    if (error) throw error;

    return NextResponse.json(shares ?? []);
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

    const { error } = await supabase
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
