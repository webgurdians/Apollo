import { useState, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, BellRing, Sparkles } from "lucide-react";

export function FeaturedDoctorPopupConfig() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: doctorsList } = trpc.patients.listDoctors.useQuery();
  const { data: popupSetting, isLoading: loadingSetting } = trpc.patients.getPopupSetting.useQuery();

  const [localIsActive, setLocalIsActive] = useState<boolean | null>(null);
  const [localDoctorId, setLocalDoctorId] = useState<string | null>(null);
  const [localDate, setLocalDate] = useState<string | null>(null);

  const isActive = localIsActive ?? popupSetting?.isActive ?? false;
  const selectedDoctorId = localDoctorId ?? (popupSetting?.doctorId ? String(popupSetting.doctorId) : "");
  const availableDate = localDate ?? (popupSetting?.availableDate ?? "");

  const handleReset = useCallback(() => {
    setLocalIsActive(null);
    setLocalDoctorId(null);
    setLocalDate(null);
  }, []);

  const updateSettingMut = trpc.patients.updatePopupSetting.useMutation({
    onSuccess: () => {
      utils.patients.getPopupSetting.invalidate();
      handleReset();
      setStatus({ type: "success", message: "Popup configuration updated successfully!" });
      setTimeout(() => setStatus(null), 3000);
    },
    onError: (e) => {
      setStatus({ type: "error", message: e.message || "Failed to update settings" });
    },
  });

  const handleSave = () => {
    const doctorId = selectedDoctorId ? Number(selectedDoctorId) : null;
    updateSettingMut.mutate({
      isActive,
      doctorId,
      availableDate,
    });
  };

  if (loadingSetting) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-apollo-blue" />
      </div>
    );
  }

  return (
    <Card className="border border-sky-100 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-sky-50/20 pb-4">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-apollo-blue" />
          <CardTitle className="text-lg font-bold">Featured Doctor Popup</CardTitle>
          <span className="ml-auto inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <Sparkles className="w-3 h-3" /> Live
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          Configure the prominent promotional modal displaying the next available doctor to all homepage visitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Toggle popup active state */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-0.5">
            <Label htmlFor="popup-toggle" className="text-sm font-semibold text-gray-900">
              Show Visitor Popup
            </Label>
            <p className="text-xs text-muted-foreground">
              Enable a prominent overlay showcasing the doctor when visitors open the site.
            </p>
          </div>
          <Switch
            id="popup-toggle"
            checked={isActive}
            onCheckedChange={(v) => setLocalIsActive(v)}
          />
        </div>

        {/* Doctor selector */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Featured Doctor</Label>
          <Select
            value={selectedDoctorId}
            onValueChange={(v) => setLocalDoctorId(v)}
            disabled={!isActive}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select doctor to showcase" />
            </SelectTrigger>
            <SelectContent>
              {doctorsList?.map((doc) => (
                <SelectItem key={doc.id} value={String(doc.id)}>
                  {doc.name} ({doc.specialty})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            The doctor's name, credentials, specialization, and image will be shown on the popup.
          </p>
        </div>

        {/* Availability description input */}
        <div className="space-y-2">
          <Label htmlFor="available-date" className="text-sm font-semibold text-gray-900">
            Next Availability Date
          </Label>
          <Input
            id="available-date"
            placeholder="e.g. Monday, 22 June (11:00 AM – 3:00 PM)"
            value={availableDate}
            onChange={(e) => setLocalDate(e.target.value)}
            disabled={!isActive}
          />
          <p className="text-[11px] text-muted-foreground">
            This will be displayed in highlight text on the visitor popup (e.g. Next available: Monday, 22 June).
          </p>
        </div>

        {status && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="pt-2">
          <Button
            className="w-full gap-2 bg-apollo-blue hover:bg-apollo-dark text-white font-medium shadow-sm transition-all"
            onClick={handleSave}
            disabled={updateSettingMut.isPending}
          >
            {updateSettingMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
