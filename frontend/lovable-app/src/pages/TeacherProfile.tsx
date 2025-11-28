import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const API_BASE_URL = "https://victor-std-torrens.app.n8n.cloud/webhook/canvas";

interface TokenStatus {
  hasToken: boolean;
  last4?: string;
}

export default function TeacherProfile() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canvasToken, setCanvasToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const fetchTeacherId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
        setTeacherInfo({
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          email: user.email || "",
        });
        fetchTokenStatus(user.id);
      } else {
        setLoading(false);
      }
    };

    fetchTeacherId();
  }, []);

  const fetchTokenStatus = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/token-status?teacher_id=${userId}`);
      const data = await response.json();

      if (data.status === "ok") {
        setTokenStatus({
          hasToken: data.hasToken,
          last4: data.last4,
        });
      } else {
        throw new Error("Failed to fetch token status");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch token status. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async () => {
    if (!teacherId || !canvasToken.trim()) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/save-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          canvas_token: canvasToken,
        }),
      });

      const data = await response.json();

      if (data.status === "ok") {
        setTokenStatus({
          hasToken: true,
          last4: data.last4,
        });
        setIsModalOpen(false);
        setCanvasToken("");
        toast({
          title: "Success",
          description: tokenStatus?.hasToken ? "Token updated successfully." : "Token saved successfully.",
        });
      } else {
        throw new Error(data.message || "Failed to save token");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save token. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setCanvasToken("");
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Teacher Profile</h1>

      {teacherInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">First Name</span>
                <p className="text-base mt-1">{teacherInfo.firstName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Last Name</span>
                <p className="text-base mt-1">{teacherInfo.lastName}</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Email</span>
              <p className="text-base mt-1">{teacherInfo.email}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Canvas Integration</CardTitle>
          <CardDescription>
            Manage your Canvas LMS access token. Your token is stored securely and you can update it at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status:</span>
            {tokenStatus?.hasToken ? (
              <Badge className="bg-green-500 hover:bg-green-600">Canvas connected</Badge>
            ) : (
              <Badge variant="secondary">Not connected</Badge>
            )}
          </div>

          {tokenStatus?.hasToken && tokenStatus.last4 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Token: ****...{tokenStatus.last4}</span>
            </div>
          )}

          <div className="pt-2">
            {tokenStatus?.hasToken ? (
              <Button onClick={openModal}>Update token</Button>
            ) : (
              <Button onClick={openModal}>Connect token</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tokenStatus?.hasToken ? "Update Canvas Token" : "Connect Canvas Token"}</DialogTitle>
            <DialogDescription>
              Enter your Canvas access token below. This token will be stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="canvas-token">Canvas Access Token</Label>
              <Input
                id="canvas-token"
                type="password"
                placeholder="Enter your Canvas token"
                value={canvasToken}
                onChange={(e) => setCanvasToken(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveToken} disabled={!canvasToken.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
