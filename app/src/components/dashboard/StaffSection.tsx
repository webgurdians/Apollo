import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, User, Shield } from "lucide-react";
import { format } from "date-fns";

const roleColors: Record<string, string> = {
  founder: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
  front_desk: "bg-blue-100 text-blue-700",
  doctor: "bg-green-100 text-green-700",
  staff: "bg-gray-100 text-gray-700",
  pharmacy: "bg-yellow-100 text-yellow-700",
  diagnostics: "bg-indigo-100 text-indigo-700",
  user: "bg-gray-100 text-gray-500",
};

const roleLabels: Record<string, string> = {
  founder: "Founder",
  admin: "Admin",
  front_desk: "Front Desk",
  doctor: "Doctor",
  staff: "Staff",
  pharmacy: "Pharmacy",
  diagnostics: "Diagnostics",
  user: "User",
};

export function StaffSection() {
  const { data: staff, isLoading } = trpc.auth.listUsers.useQuery();
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "staff" | "admin" | "front_desk" | "doctor" | "pharmacy" | "diagnostics" | "founder">("front_desk");

  const createUser = trpc.auth.createUser.useMutation({
    onSuccess: () => {
      utils.auth.listUsers.invalidate();
      setShowAdd(false);
      setUsername("");
      setPassword("");
      setName("");
      setRole("front_desk");
    },
  });

  const deleteUser = trpc.auth.deleteUser.useMutation({
    onSuccess: () => utils.auth.listUsers.invalidate(),
  });

  const activeStaff = staff?.filter((u) => !u.deletedAt) || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-apollo-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activeStaff.length} active staff members
        </p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate({ username, password, name, role });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <Select value={role} onValueChange={(val: string) => setRole(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front_desk">Front Desk</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="diagnostics">Diagnostics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Add Staff
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No staff members
                </TableCell>
              </TableRow>
            ) : (
              activeStaff.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">#{u.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {u.name || u.username}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.username}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roleLabels[u.role] || u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-green-500 font-medium">Active</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastSignInAt ? format(new Date(u.lastSignInAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500"
                      title="Deactivate user"
                      onClick={() => {
                        if (confirm(`Deactivate user "${u.username}"?`)) {
                          deleteUser.mutate({ id: u.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
