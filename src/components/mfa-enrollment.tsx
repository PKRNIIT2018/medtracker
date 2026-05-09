"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, QrCode, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MfaEnrollmentProps {
  onEnrolled?: () => void;
}

interface EnrollmentData {
  id: string;
  secret: string;
  totp_uri: string;
  qr_code?: string;
}

export function MfaEnrollment({ onEnrolled }: MfaEnrollmentProps) {
  const supabase = createClient();
  const [step, setStep] = useState<"init" | "scan" | "verify" | "success">("init");
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  async function startEnrollment() {
    setIsLoading(true);
    setError("");

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "MedTracker",
      });

      if (enrollError) {
        throw enrollError;
      }

      if (data) {
        setEnrollmentData(data as unknown as EnrollmentData);

        const QRCode = await import("qrcode");
        const d = data as unknown as { totp_uri: string };
        const dataUrl = await QRCode.toDataURL(d.totp_uri);
        setQrCodeDataUrl(dataUrl);

        setStep("scan");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start enrollment";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyAndEnroll() {
    if (!enrollmentData || verificationCode.length !== 6) return;

    setIsLoading(true);
    setError("");

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) {
        throw challengeError;
      }

      if (!challengeData) {
        throw new Error("Failed to create verification challenge");
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        code: verificationCode,
        challengeId: challengeData.id,
      });

      if (verifyError) {
        throw verifyError;
      }

      setStep("success");
      toast.success("MFA enrolled successfully!");
      onEnrolled?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid verification code";
      setError(message);
      setVerificationCode("");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function copySecret() {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      toast.success("Secret key copied!");
    }
  }

  if (step === "init") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set Up Authenticator App
          </CardTitle>
          <CardDescription>
            Add an extra layer of security by requiring a verification code in addition to your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startEnrollment} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Start Enrollment
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "scan") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeDataUrl && (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="QR Code"
                className="border p-2"
                style={{ maxWidth: "200px" }}
              />
            </div>
          )}

          {enrollmentData?.secret && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Or enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted p-2 text-sm font-mono">
                  {enrollmentData.secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Button onClick={() => setStep("verify")} className="w-full">
            I&apos;ve added it — Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verify Setup
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to complete setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code"
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
            onClick={verifyAndEnroll}
            disabled={verificationCode.length !== 6 || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Enable"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setStep("scan")}
            className="w-full"
          >
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <Check className="h-5 w-5" />
          MFA Enabled
        </CardTitle>
        <CardDescription>
          Your account is now protected with multi-factor authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Next time you log in, you&apos;ll be prompted to enter a code from your authenticator app.
        </p>
      </CardContent>
    </Card>
  );
}