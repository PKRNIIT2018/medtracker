"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Check, Loader2 } from "lucide-react";
import { MfaEnrollment } from "@/components/mfa-enrollment";
import { MfaManagement } from "@/components/mfa-management";

const supabase = createClient();

export function SecuritySection() {
  const qc = useQueryClient();
  const [pinCode, setPinCode] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeStep, setPinChangeStep] = useState<"verify" | "set">("verify");
  const [pinVerifyError, setPinVerifyError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [pinEnabled, setPinEnabled] = useState<boolean | null>(null);
  const [mfaKey, setMfaKey] = useState(0);

  useEffect(() => {
    supabase.from("user_settings").select("app_pin_enabled").single().then(
      ({ data }) => setPinEnabled(data?.app_pin_enabled ?? false)
    );
  }, []);

  async function handleSetPin() {
    if (pinCode.length !== 4 || pinCode !== pinConfirm) {
      toast.error("PIN must be 4 digits and match confirmation");
      return;
    }
    const { error: reauthError } = await supabase.auth.reauthenticate();
    if (reauthError) {
      toast.error("Please re-authenticate before setting a PIN. Check your email for a confirmation link.");
      return;
    }
    const res = await fetch("/api/pin/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", pin: pinCode }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to set PIN");
      return;
    }
    toast.success("PIN set successfully");
    setPinCode(""); setPinConfirm("");
    setPinEnabled(true);
    qc.invalidateQueries({ queryKey: ["user-settings"] });
  }

  async function handleDisablePin() {
    const { error: reauthError } = await supabase.auth.reauthenticate();
    if (reauthError) {
      toast.error("Please re-authenticate before disabling your PIN. Check your email for a confirmation link.");
      return;
    }
    const res = await fetch("/api/pin/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable" }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to disable PIN");
      return;
    }
    toast.success("PIN disabled");
    setPinEnabled(false);
    qc.invalidateQueries({ queryKey: ["user-settings"] });
  }

  async function handleVerifyCurrentPin() {
    if (!currentPin || currentPin.length !== 4) {
      setPinVerifyError("Enter your current 4-digit PIN");
      return;
    }
    const res = await fetch("/api/pin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPin }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "No PIN set") { setIsChangingPin(false); return; }
      setPinVerifyError(data.error || "Verification failed");
      return;
    }
    if (data.valid) {
      setPinChangeStep("set");
      setPinVerifyError("");
    } else {
      setPinVerifyError("Incorrect PIN");
      setCurrentPin("");
    }
  }

  async function handleChangePin() {
    if (pinCode.length !== 4 || pinCode !== pinConfirm) {
      toast.error("PIN must be 4 digits and match confirmation");
      return;
    }
    setIsPending(true);
    const res = await fetch("/api/pin/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", pin: pinCode }),
    });
    setIsPending(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to change PIN");
      return;
    }
    setPinCode(""); setPinConfirm(""); setCurrentPin("");
    setIsChangingPin(false); setPinChangeStep("verify");
    toast.success("PIN changed successfully");
    qc.invalidateQueries({ queryKey: ["user-settings"] });
  }

  function startChangePin() {
    setIsChangingPin(true); setPinChangeStep("verify");
    setPinVerifyError(""); setCurrentPin(""); setPinCode(""); setPinConfirm("");
  }

  function cancelChangePin() {
    setIsChangingPin(false); setPinChangeStep("verify");
    setPinVerifyError(""); setCurrentPin(""); setPinCode(""); setPinConfirm("");
  }

  const showEnabled = pinEnabled === true;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            App PIN
          </CardTitle>
          <CardDescription>Set a 4-digit PIN for quick access to the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isChangingPin ? (
            <div className="space-y-4">
              {pinChangeStep === "verify" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your current PIN to continue</p>
                  <div className="space-y-2">
                    <Label>Current PIN</Label>
                    <Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                      value={currentPin}
                      onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "")); setPinVerifyError(""); }}
                      placeholder="••••" className="text-center tracking-[0.5em] font-mono text-lg" />
                    {currentPin && <div className="flex justify-center gap-2 mt-1">{currentPin.split("").map((_, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full bg-primary block" />))}</div>}
                  </div>
                  {pinVerifyError && <p className="text-sm text-destructive">{pinVerifyError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handleVerifyCurrentPin}>Verify</Button>
                    <Button variant="outline" onClick={cancelChangePin}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your new PIN</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>New PIN</Label>
                      <Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••" className="text-center tracking-[0.5em] font-mono text-lg" />
                      {pinCode && <div className="flex justify-center gap-2 mt-1">{pinCode.split("").map((_, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full bg-primary block" />))}</div>}
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm PIN</Label>
                      <Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                        value={pinConfirm}
                        onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••" className="text-center tracking-[0.5em] font-mono text-lg" />
                      {pinConfirm && <div className="flex justify-center gap-2 mt-1">{pinConfirm.split("").map((_, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full bg-primary block" />))}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleChangePin} disabled={isPending}>
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Change PIN
                    </Button>
                    <Button variant="outline" onClick={cancelChangePin}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ) : showEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">PIN is enabled</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={startChangePin}>Change PIN</Button>
                <Button variant="destructive" onClick={handleDisablePin}>Disable PIN</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">PIN is not set. Set a PIN to add an extra layer of security.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PIN Code</Label>
                  <Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••" className="text-center tracking-[0.5em] font-mono text-lg" />
                  {pinCode && <div className="flex justify-center gap-2 mt-1">{pinCode.split("").map((_, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full bg-primary block" />))}</div>}
                </div>
                <div className="space-y-2">
                  <Label>Confirm PIN</Label>
                  <Input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••" className="text-center tracking-[0.5em] font-mono text-lg" />
                  {pinConfirm && <div className="flex justify-center gap-2 mt-1">{pinConfirm.split("").map((_, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full bg-primary block" />))}</div>}
                </div>
              </div>
              <Button onClick={handleSetPin} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Set PIN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MfaEnrollment key={mfaKey} onEnrolled={() => setMfaKey(k => k + 1)} />
      <MfaManagement key={mfaKey + 1} onUnenrolled={() => setMfaKey(k => k + 1)} onAddNew={() => setMfaKey(k => k + 1)} />
    </>
  );
}
