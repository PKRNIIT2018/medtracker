import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log, logError } from "@/lib/logger";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { action, pin } = await request.json();

    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    if (!["set", "disable"].includes(action)) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    if (action === "set" && (!pin || typeof pin !== "string" || pin.length !== 4)) {
      return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logError("pin_manage_auth_failed", authError ?? new Error("No user"));
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (action === "set") {
      const hash = await bcrypt.hash(pin, 10);
      const { error } = await supabase
        .from("user_settings")
        .update({ app_pin_hash: hash, app_pin_enabled: true })
        .eq("user_id", user.id);

      if (error) throw error;
      log("pin_set", { userId: user.id });
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("user_settings")
      .update({ app_pin_hash: null, app_pin_enabled: false })
      .eq("user_id", user.id);

    if (error) throw error;
    log("pin_disable", { userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("pin_manage_error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
