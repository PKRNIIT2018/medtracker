"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, AlertCircle } from "lucide-react";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

interface PinGateProps {
  onUnlock: () => void;
}

export function PinGate({ onUnlock }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchPinHash() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("app_pin_hash")
          .eq("user_id", user.id)
          .single();
        setPinHash(settings?.app_pin_hash || null);
      }
      setIsLoading(false);
    }
    fetchPinHash();
  }, [supabase]);

  useEffect(() => {
    if (!isLocked || !lockoutEnd) return;

    const remaining = lockoutEnd - Date.now();
    if (remaining <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setIsLocked(false);
      setLockoutEnd(null);
      setAttempts(0);
    }, remaining);

    return () => clearTimeout(timer);
  }, [isLocked, lockoutEnd]);

  const handleVerify = useCallback(async () => {
    if (pin.length !== 4 || !pinHash) return;

    setIsVerifying(true);
    setError("");

    try {
      const isValid = await bcrypt.compare(pin, pinHash);

      if (isValid) {
        sessionStorage.setItem("pin_verified", "true");
        sessionStorage.setItem("pin_verified_at", Date.now().toString());
        setAttempts(0);
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setLockoutEnd(Date.now() + LOCKOUT_DURATION);
          setError(`Too many attempts. Try again in ${LOCKOUT_DURATION / 60000} minutes.`);
        } else {
          setError(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [pin, pinHash, attempts, onUnlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && pin.length === 4 && !isLocked) {
        handleVerify();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, isLocked, handleVerify]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enter PIN</CardTitle>
          <CardDescription>Enter your 4-digit PIN to access the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full ${
                  pin.length > i ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 4-digit PIN"
            disabled={isLocked || isVerifying}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={pin.length !== 4 || isLocked || isVerifying}
            className="w-full"
          >
            {isVerifying ? "Verifying..." : "Unlock"}
          </Button>

          {isLocked && lockoutEnd && (
            <p className="text-center text-sm text-muted-foreground">
              Locked out until {new Date(lockoutEnd).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function isPinVerified(): boolean {
  const verified = sessionStorage.getItem("pin_verified");
  const verifiedAt = sessionStorage.getItem("pin_verified_at");

  if (!verified || !verifiedAt) return false;

  const elapsed = Date.now() - parseInt(verifiedAt, 10);
  if (elapsed > INACTIVITY_TIMEOUT) {
    sessionStorage.removeItem("pin_verified");
    sessionStorage.removeItem("pin_verified_at");
    return false;
  }

  return true;
}

export function clearPinSession(): void {
  sessionStorage.removeItem("pin_verified");
  sessionStorage.removeItem("pin_verified_at");
}

export function refreshPinSession(): void {
  if (isPinVerified()) {
    sessionStorage.setItem("pin_verified_at", Date.now().toString());
  }
}