"use client";

import Link from "next/link";
import { useDoctorPatients } from "@/features/doctor/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronRight, Users } from "lucide-react";

export default function DoctorPatientsPage() {
  const { data: patients, isLoading, error } = useDoctorPatients();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header-bg rounded-xl p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Patients</h1>
          <p className="text-muted-foreground">View shared health data from your patients</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-sm text-destructive">Failed to load patients: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && patients && patients.length === 0 && (
        <Card>
          <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <Users className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No patients have shared their data with you yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Ask your patients to share access from their MedTracker settings.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && patients && patients.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => (
            <Link key={patient.patient_id} href={`/doctor/patients/${patient.patient_id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{patient.full_name ?? "Unknown Patient"}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>
                    Access: {patient.access_tables.join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4 text-blue-600" />
                    {patient.access_tables.includes("blood_sugar") && "Blood Sugar & AGP"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
