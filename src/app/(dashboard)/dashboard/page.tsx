import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.user_metadata?.full_name ?? user.email}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Medications Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blood Sugar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Water Intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">-- ml</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blood Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--/--</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Medications</CardTitle>
            <CardDescription>Your medication intake for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No medications tracked yet. Add your medications in the
              Medications section.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>Your recent activity log</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No activity recorded yet. Start tracking your activities.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
