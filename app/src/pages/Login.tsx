import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      const role = data.role;
      if (role === "doctor") {
        navigate("/doctor");
      } else if (role === "pharmacy") {
        navigate("/pharmacy");
      } else if (role === "diagnostics") {
        navigate("/diagnostics");
      } else if (role === "front_desk") {
        navigate("/front-desk");
      } else {
        navigate("/admin");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-apollo-light to-white">
      <Card className="w-full max-w-sm border shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="w-12 h-12 bg-apollo-blue rounded-xl flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Apollo Admin Access</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage appointments and leads
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {loginMutation.error && (
              <p className="text-sm text-red-500 font-medium text-center">
                {loginMutation.error.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-apollo-blue hover:bg-apollo-dark text-white"
              size="lg"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-6">
            Only authorized staff can access the admin dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
