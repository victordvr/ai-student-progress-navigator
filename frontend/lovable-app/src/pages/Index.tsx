import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // Auto-redirect logged-in users to courses
      if (user) {
        navigate("/courses");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/courses");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="text-center px-4 max-w-3xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-6">
          <GraduationCap className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="mb-4 text-4xl font-bold text-foreground">AI Student Learning Progress Navigator</h1>
        <p className="text-xl text-muted-foreground mb-8">Track, analyze, and enhance student learning outcomes</p>
        
        <div className="flex gap-4 justify-center">
          <Link to="/login">
            <Button size="lg">Teacher Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
