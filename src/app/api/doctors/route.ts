import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    logError("doctors_list_error", error);
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Doctor name is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: body.name.trim(),
      specialty: body.specialty?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      is_primary: body.is_primary === true,
      notes: body.notes?.trim() || null,
    };

    if (payload.is_primary) {
      await supabase
        .from("doctors")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .is("deleted_at", null);
    }

    const { data, error } = await supabase
      .from("doctors")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    log("doctor_created", { userId: user.id, doctorId: data.id });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    logError("doctor_create_error", error);
    return NextResponse.json({ error: "Failed to create doctor" }, { status: 500 });
  }
}
