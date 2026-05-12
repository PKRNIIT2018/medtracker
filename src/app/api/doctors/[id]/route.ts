import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";

async function getDoctorOrThrow(id: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error("Doctor not found");
  }
  return data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await getDoctorOrThrow(id, user.id);

    const allowed: Record<string, unknown> = {};
    const editableFields = ["name", "specialty", "phone", "email", "is_primary", "notes"];

    for (const field of editableFields) {
      if (field in body) {
        if (field === "name") {
          if (!body.name || !body.name.trim()) {
            return NextResponse.json({ error: "Doctor name cannot be empty" }, { status: 400 });
          }
          allowed.name = body.name.trim();
        } else if (field === "is_primary") {
          allowed.is_primary = body.is_primary === true;
        } else {
          allowed[field] = body[field]?.trim() || null;
        }
      }
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    if (allowed.is_primary === true) {
      await supabase
        .from("doctors")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .neq("id", id)
        .is("deleted_at", null);
    }

    const { data, error } = await supabase
      .from("doctors")
      .update(allowed)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    log("doctor_updated", { userId: user.id, doctorId: id });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Doctor not found") {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }
    logError("doctor_update_error", error);
    return NextResponse.json({ error: "Failed to update doctor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await getDoctorOrThrow(id, user.id);

    const { error } = await supabase
      .from("doctors")
      .update({ deleted_at: new Date().toISOString(), is_primary: false })
      .eq("id", id);

    if (error) throw error;

    log("doctor_deleted", { userId: user.id, doctorId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Doctor not found") {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }
    logError("doctor_delete_error", error);
    return NextResponse.json({ error: "Failed to delete doctor" }, { status: 500 });
  }
}
