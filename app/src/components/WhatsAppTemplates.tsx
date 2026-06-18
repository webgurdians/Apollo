import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

const CONFIRMATION_TEMPLATE = `Hello {name},

Your appointment with {doctor}

Date: {date}
Time: {time}

Apollo Information Centre Aranghata`;

const REMINDER_TEMPLATE = `Reminder:

Your appointment is tomorrow.

Doctor: {doctor}
Time: {time}`;

export function WhatsAppTemplates() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">WhatsApp Message Templates</h3>
        <p className="text-sm text-muted-foreground">
          Copy these templates and use them in WhatsApp. Placeholders like {"{name}"} will be replaced with actual data.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Appointment Confirmation</h4>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(CONFIRMATION_TEMPLATE, "confirmation")}>
            {copied === "confirmation" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied === "confirmation" ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap font-sans">{CONFIRMATION_TEMPLATE}</pre>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Appointment Reminder</h4>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(REMINDER_TEMPLATE, "reminder")}>
            {copied === "reminder" ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied === "reminder" ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap font-sans">{REMINDER_TEMPLATE}</pre>
      </div>
    </div>
  );
}
