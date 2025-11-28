import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/courses") {
      return location.pathname === "/courses" || location.pathname.startsWith("/courses/");
    }
    return location.pathname === path;
  };

  return (
    <nav className="flex items-center gap-1">
      <Link to="/courses">
        <Button 
          variant={isActive("/courses") ? "secondary" : "ghost"} 
          size="sm"
          className={cn(
            "transition-colors",
            isActive("/courses") && "bg-secondary text-secondary-foreground"
          )}
        >
          Courses
        </Button>
      </Link>
      <Link to="/profile">
        <Button 
          variant={isActive("/profile") ? "secondary" : "ghost"} 
          size="sm"
          className={cn(
            "transition-colors",
            isActive("/profile") && "bg-secondary text-secondary-foreground"
          )}
        >
          Profile
        </Button>
      </Link>
    </nav>
  );
};

export default Navigation;
