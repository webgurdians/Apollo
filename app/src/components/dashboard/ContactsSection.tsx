import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Phone } from "lucide-react";

export function ContactsSection() {
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();
  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => utils.contacts.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts?.length === 0 ? (
        <div className="col-span-full text-center py-8 text-muted-foreground">
          No enquiries yet.
        </div>
      ) : (
        contacts?.map((contact) => (
          <div key={contact.id} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500"
                onClick={() => {
                  if (confirm("Delete this enquiry?")) {
                    deleteContact.mutate({ id: contact.id });
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-apollo-blue hover:underline">
                  {contact.phone}
                </a>
              </div>
            </div>
            {contact.message && (
              <p className="text-sm bg-gray-50 rounded-lg p-3 border text-gray-700">
                {contact.message}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
