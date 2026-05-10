import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bloodPressureSchema, weightSchema, bloodPanelSchema, type BloodPressureFormData, type WeightFormData } from "@/features/vitals/schema";
import { format } from "date-fns";

const panelFields = [
  { key: "s_chol" as const, label: "S-CHOL", description: "Total cholesterol", unit: "mmol/l", range: "Normal: below 5.0 mmol/L" },
  { key: "s_tag" as const, label: "S-TAG", description: "Triglycerides", unit: "mmol/l", range: "Normal: below 1.7 mmol/L" },
  { key: "s_hdl" as const, label: "S-HDL", description: "HDL cholesterol", unit: "mmol/l", range: "Good: above 1.0 mmol/L (men), above 1.2 mmol/L (women)" },
  { key: "non_hdl" as const, label: "non-HDL", description: "Non-HDL cholesterol", unit: "mmol/l", range: "Normal: below 4.0 mmol/L" },
  { key: "s_ck" as const, label: "S-CK", description: "Creatine kinase", unit: "ukat/l", range: "Range: 0.2–2.27 ukat/L (may vary by lab/sex)" },
  { key: "b_hba1c_dc" as const, label: "B-HbA1c DC", description: "HbA1c in DCCT %", unit: "%", range: "Normal: <6.0%; 6.0–6.4% prediabetes; ≥6.5% diabetes" },
  { key: "b_hba1c_if" as const, label: "B-HbA1c IF", description: "HbA1c in IFCC mmol/mol", unit: "mmol/mol", range: "Normal: ≤41; 42–47 prediabetes; ≥48 diabetes" },
];

const dateStr = format(new Date(), "yyyy-MM-dd");

interface AddVitalsDialogProps {
  tab: "blood-pressure" | "weight" | "blood-panel";
  setTab: (tab: "blood-pressure" | "weight" | "blood-panel") => void;
  bpForm: BloodPressureFormData;
  setBpForm: React.Dispatch<React.SetStateAction<BloodPressureFormData>>;
  weightForm: WeightFormData;
  setWeightForm: React.Dispatch<React.SetStateAction<WeightFormData>>;
  panelForm: any;
  setPanelForm: React.Dispatch<React.SetStateAction<any>>;
  handleSubmitBP: (e: React.FormEvent) => void;
  handleSubmitWeight: (e: React.FormEvent) => void;
  handleSubmitPanel: (e: React.FormEvent) => void;
}

export function AddVitalsDialogContent({
  tab,
  setTab,
  bpForm,
  setBpForm,
  weightForm,
  setWeightForm,
  panelForm,
  setPanelForm,
  handleSubmitBP,
  handleSubmitWeight,
  handleSubmitPanel,
}: AddVitalsDialogProps) {
  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="blood-pressure">BP</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="blood-panel">Blood Panel</TabsTrigger>
        </TabsList>
        <TabsContent value="blood-pressure">
          <form onSubmit={handleSubmitBP} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Systolic</Label><Input type="number" value={bpForm.systolic} onChange={(e) => setBpForm({ ...bpForm, systolic: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Diastolic</Label><Input type="number" value={bpForm.diastolic} onChange={(e) => setBpForm({ ...bpForm, diastolic: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Heart Rate (optional)</Label><Input type="number" value={bpForm.heart_rate ?? ""} onChange={(e) => setBpForm({ ...bpForm, heart_rate: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={bpForm.reading_date} onChange={(e) => setBpForm({ ...bpForm, reading_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={bpForm.reading_time} onChange={(e) => setBpForm({ ...bpForm, reading_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={bpForm.notes} onChange={(e) => setBpForm({ ...bpForm, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </TabsContent>
        <TabsContent value="weight">
          <form onSubmit={handleSubmitWeight} className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={weightForm.weight_kg} onChange={(e) => setWeightForm({ ...weightForm, weight_kg: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={weightForm.reading_date} onChange={(e) => setWeightForm({ ...weightForm, reading_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={weightForm.notes} onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </TabsContent>
        <TabsContent value="blood-panel">
          <form onSubmit={handleSubmitPanel} className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {panelFields.map((f) => (
                <div key={f.key} className={f.key === "b_hba1c_if" ? "col-span-2" : ""}>
                  <Label>{f.label} ({f.unit})</Label>
                  <Input type="number" step="0.01" min="0" value={panelForm[f.key]} onChange={(e) => setPanelForm({ ...panelForm, [f.key]: e.target.value })} />
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.range}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={panelForm.reading_date} onChange={(e) => setPanelForm({ ...panelForm, reading_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={panelForm.notes} onChange={(e) => setPanelForm({ ...panelForm, notes: e.target.value })} rows={2} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </TabsContent>
      </Tabs>
    </>
  );
}