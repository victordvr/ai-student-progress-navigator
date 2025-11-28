import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { RefreshCw, BookOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Course {
  id: number;
  name: string;
}

interface CoursesResponse {
  status: string;
  courses: Course[];
  lastSyncedAt?: string;
  stale?: boolean;
}

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getTeacherId();
  }, []);

  const fetchCourses = async (showToast = false) => {
    if (!teacherId) return;
    
    try {
      const response = await fetch(
        `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/courses?teacher_id=${teacherId}`
      );
      
      if (!response.ok) throw new Error("Failed to fetch courses");
      
      const data: CoursesResponse = await response.json();
      
      setCourses(data.courses || []);
      setLastSynced(data.lastSyncedAt || null);
      setIsStale(data.stale || false);
      setError(null);
      
      if (showToast && !data.stale) {
        toast({
          title: "Courses updated",
          description: "Your course list has been refreshed.",
        });
      }
      
      return data;
    } catch (err) {
      setError("Couldn't load courses. Please try Refresh.");
      toast({
        title: "Error",
        description: "Failed to fetch courses.",
        variant: "destructive",
      });
    }
  };

  const syncCourses = async () => {
    if (!teacherId) return;
    
    setIsRefreshing(true);
    
    try {
      const response = await fetch(
        `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/courses/sync?teacher_id=${teacherId}`
      );
      
      if (!response.ok) throw new Error("Sync failed");
      
      // Wait 1 second then fetch updated courses
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchCourses(true);
    } catch (err) {
      console.error("Sync error:", err);
      toast({
        title: "Error",
        description: "Couldn't refresh courses right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await syncCourses();
  };

  useEffect(() => {
    if (teacherId) {
      fetchCourses().then((data) => {
        setIsLoading(false);
        
        // Auto-refresh if stale
        if (data?.stale) {
          syncCourses();
        }
      });
    }
  }, [teacherId]);

  const formatLastSynced = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy, h:mm a");
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Courses Dashboard</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {lastSynced && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {formatLastSynced(lastSynced)}
                </p>
              )}
              <div className="flex gap-2">
                <Badge variant={isStale ? "outline" : "default"} className={isStale ? "border-amber-500 text-amber-600" : "bg-green-600"}>
                  {isStale ? "Needs refresh" : "Up to date"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Refreshing indicator */}
        {(isRefreshing || isStale) && (
          <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Refreshing courses…</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          /* Empty state */
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-6">
                Try refreshing to pull your Canvas courses.
              </p>
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Course grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Course ID: {course.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Link to={`/courses/${course.id}`}>
                    <Button className="w-full" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
