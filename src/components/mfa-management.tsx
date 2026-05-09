"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Factor {
  id: string;
  factor_type: "totp" | "webauthn" | "phone";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

interface MfaManagementProps {
  onUnenrolled?: () => void;
  onAddNew?: () => void;
}

export function MfaManagement({ onUnenrolled, onAddNew }: MfaManagementProps) {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unEnrollingId, setUnenrollingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchFactors() {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();

        if (error) throw error;

        if (!ignore) {
          const allFactors = (data as { all?: Factor[] })?.all || [];
          const totpFactors = allFactors.filter(
            (f) => f.factor_type === "totp"
          );
          setFactors(totpFactors);
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : "Failed to load factors";
          toast.error(message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchFactors();

    return () => { ignore = true; };
  }, [supabase, refreshKey]);

  async function unEnroll(factorId: string) {
    setUnenrollingId(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      toast.success("MFA factor removed");
      setRefreshKey(k => k + 1);
      onUnenrolled?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove factor";
      toast.error(message);
    } finally {
      setUnenrollingId(null);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading factors...</p>
        </CardContent>
      </Card>
    );
  }

  if (factors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            No MFA Configured
          </CardTitle>
          <CardDescription>
            Add an authenticator app to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Authenticator
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active MFA Factors
        </CardTitle>
        <CardDescription>
          Your account is protected with multi-factor authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor) => (
          <div
            key={factor.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-1">
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                Added {new Date(factor.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                Status: {factor.status}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove MFA Factor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disable multi-factor authentication for your account.
                    You&apos;ll only need your email and password to log in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => unEnroll(factor.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {unEnrollingId === factor.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}

        <Button variant="outline" onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Another Authenticator
        </Button>
      </CardContent>
    </Card>
  );
}