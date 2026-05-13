"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Share2, Trash2, UserPlus, Activity, Copy } from "lucide-react";

const supabase = createClient();

const TABLE_OPTIONS = [
  { value: "blood_sugar", label: "Blood Sugar (including AGP Reports)" },
] as const;

export default function SharingPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>(["blood_sugar"]);
  const [sending, setSending] = useState(false);
  const [newShare, setNewShare] = useState<{ email: string; password: string } | null>(null);

  const { data: shares, isLoading } = useQuery({
    queryKey: ["my-shares"],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from("shared_patients")
        .select("*")
        .eq("patient_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleAddShare() {
    if (!email || selectedTables.length === 0) {
      toast.error("Enter a doctor email and select at least one data type");
      return;
    }
    setNewShare(null);
    setSending(true);
    const res = await fetch("/api/shares", {
      method: "POST",
      body: JSON.stringify({ doctorEmail: email, accessTables: selectedTables }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to share");
    } else {
      if (data.isNew) {
        setNewShare({ email: data.doctorEmail, password: data.password });
      } else {
        toast.success("Access updated for doctor");
      }
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["my-shares"] });
    }
    setSending(false);
  }

  function copyCredentials() {
    if (!newShare) return;
    navigator.clipboard.writeText(
      `Doctor login for MedTracker\nEmail: ${newShare.email}\nPassword: ${newShare.password}\nLogin at: ${window.location.origin}/login`
    );
    toast.success("Credentials copied");
  }

  async function handleRevoke(id: string) {
    const res = await fetch("/api/shares", {
      method: "DELETE",
      body: JSON.stringify({ shareId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to revoke");
    } else {
      toast.success("Access revoked");
      queryClient.invalidateQueries({ queryKey: ["my-shares"] });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sharing</h1>
        <p className="text-muted-foreground">Share your health data with your doctor</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Share with a Doctor
          </CardTitle>
          <CardDescription>
            Enter your doctor&apos;s email. An account will be created for them automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Doctor&apos;s Email</Label>
            <Input
              type="email"
              placeholder="doctor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data to share</Label>
            <div className="space-y-2">
              {TABLE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedTables.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      setSelectedTables(
                        checked
                          ? [...selectedTables, opt.value]
                          : selectedTables.filter((t) => t !== opt.value)
                      );
                    }}
                  />
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleAddShare} disabled={sending}>
            <Share2 className="mr-2 h-4 w-4" />
            {sending ? "Sharing..." : "Share Access"}
          </Button>

          {newShare && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-sm font-medium mb-2">Account created for your doctor!</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Email:</span> {newShare.email}</p>
                <p><span className="font-medium">Password:</span> <code className="rounded bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900">{newShare.password}</code></p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tell your doctor to log in at medtracker.vercel.app/login with these credentials.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={copyCredentials}>
                <Copy className="mr-1 h-3 w-3" /> Copy credentials
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared With</CardTitle>
          <CardDescription>Doctors who have access to your data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!isLoading && (!shares || shares.length === 0) && (
            <p className="text-sm text-muted-foreground">You haven&apos;t shared your data with anyone yet.</p>
          )}

          {!isLoading && shares && shares.length > 0 && (
            <div className="space-y-3">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{share.email ?? "Doctor"}</p>
                    <p className="text-xs text-muted-foreground">
                      Access to: {share.access_tables.join(", ")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRevoke(share.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
