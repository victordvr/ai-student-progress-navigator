import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import Navigation from "./Navigation";
import type { User } from "@supabase/supabase-js";

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Hide header on landing and login pages
  const hideHeader = location.pathname === "/" || location.pathname === "/login";

  useEffect(() => {
    // Check current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Success",
        description: "You've been logged out successfully.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (hideHeader) {
    return null;
  }

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link 
          to={user ? "/courses" : "/"} 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <GraduationCap className="w-6 h-6 text-primary" />
          <span className="font-semibold text-foreground hidden sm:inline">AI Student Learning Progress Navigator</span>
          <span className="font-semibold text-foreground sm:hidden">ASLPN</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Navigation />
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.user_metadata?.first_name || user.email}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Log out
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
