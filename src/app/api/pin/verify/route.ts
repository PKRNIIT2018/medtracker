import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { currentPin } = await request.json();

    if (!currentPin || typeof currentPin !== "string" || currentPin.length !== 4) {
      return NextResponse.json({ valid: false, error: "Invalid PIN format" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logError("pin_verify_auth_failed", authError ?? new Error("No user"));
      return NextResponse.json({ valid: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("app_pin_hash")
      .eq("user_id", user.id)
      .single();

    if (!settings?.app_pin_hash) {
      return NextResponse.json({ valid: false, error: "No PIN set" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPin, settings.app_pin_hash);
    log("pin_verify", { userId: user.id, valid: isValid });

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    logError("pin_verify_error", error);
    return NextResponse.json({ valid: false, error: "Verification failed" }, { status: 500 });
  }
}
