import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";
import { validateSettingsFields } from "@/lib/settings-validation";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    const { allowed, rejected, hasValidFields } = validateSettingsFields(body);

    if (!hasValidFields) {
      return NextResponse.json({
        error: "No valid fields provided",
        rejected,
      }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logError("settings_auth_failed", authError ?? new Error("No user"));
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from("user_settings")
      .update(allowed)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    log("settings_updated", { userId: user.id, fields: Object.keys(allowed), rejected });

    return NextResponse.json({
      success: true,
      updated: Object.keys(allowed),
      rejected: rejected.length > 0 ? rejected : undefined,
    });
  } catch (error) {
    logError("settings_update_error", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
