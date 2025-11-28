import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BarChart3, Users, AlertTriangle, ArrowUpDown, ExternalLink, Mail, Info, Loader2, RefreshCw, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Student {
  student_canvas_id: number;
  name: string;
  email: string | null;
  email_available: boolean;
  last_activity_at: string | null;
  inactive_days: number | null;
  inactive_7_plus: boolean;
  last_attended_at: string | null;
  attendance_days: number | null;
  attendance_risk: string;
}

interface MissingAssignment {
  assignment_id: number;
  title: string;
  due_at: string;
  points_possible: number;
  preview_url: string;
}

interface StudentSubmission {
  student_canvas_id: number;
  name: string;
  enrollment_state: string;
  missing_assignments_count: number;
  has_missing_assignments: boolean;
  missing_assignments: MissingAssignment[];
  current_score: number | null;
  final_score: number | null;
  grade_url: string;
}

interface MergedStudentData extends Student {
  submission?: StudentSubmission;
}

interface Assignment {
  assignment_id: number;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  assignment_url: string;
  days_until_due: number | null;
  due_status: "overdue" | "due_today" | "due_soon" | "future" | "no_due_date";
  total_students: number;
  submitted_count: number;
  pending_count: number;
}

type SortField = "name" | "last_activity";
type SortDirection = "asc" | "desc";

const CourseOverview = () => {
  const { course_id } = useParams<{ course_id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<MergedStudentData | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Reminder modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [course, setCourse] = useState<{ name: string } | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [course_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view students",
          variant: "destructive",
        });
        return;
      }

      // Fetch course details to get the course name
      try {
        const coursesUrl = `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/courses?teacher_id=${user.id}`;
        const coursesResponse = await fetch(coursesUrl);
        
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          const foundCourse = coursesData.courses?.find((c: any) => c.id === parseInt(course_id || "0"));
          if (foundCourse) {
            setCourse({ name: foundCourse.name });
          }
        }
      } catch (courseError) {
        console.error("Error fetching course details (non-blocking):", courseError);
      }

      const studentsUrl = `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/students?teacher_id=${user.id}&course_id_canvas=${course_id}`;
      
      const studentsResponse = await fetch(studentsUrl);

      if (!studentsResponse.ok) {
        throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
      }

      const studentsData = await studentsResponse.json();
      setStudents(studentsData.students || []);

      // Fetch submissions separately - don't block student display if this fails
      try {
        const submissionsUrl = `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/submissions?teacher_id=${user.id}&course_id_canvas=${course_id}`;
        const submissionsResponse = await fetch(submissionsUrl);
        
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setSubmissions(submissionsData.students || []);
        }
      } catch (submissionsError) {
        console.error("Error fetching submissions (non-blocking):", submissionsError);
        // Submissions fetch failed but we still have students
      }

      // Fetch assignments separately
      fetchAssignments();
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const assignmentsUrl = `https://victor-std-torrens.app.n8n.cloud/webhook/canvas/assignments?teacher_id=${user.id}&course_id_canvas=${course_id}`;
      const assignmentsResponse = await fetch(assignmentsUrl);

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        // Sort by due_at ascending (null values at the end)
        const sortedAssignments = (assignmentsData.assignments || []).sort((a: Assignment, b: Assignment) => {
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        });
        setAssignments(sortedAssignments);
      }
    } catch (error) {
      console.error("Error fetching assignments (non-blocking):", error);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const renderStudentInfo = (student: Student) => {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-medium">{student.name}</span>
        {student.email && (
          <Badge variant="secondary" className="w-fit text-xs font-normal">
            {student.email}
          </Badge>
        )}
      </div>
    );
  };

  const generateEmailDraft = async (student: MergedStudentData) => {
    setIsGeneratingDraft(true);
    setDraftError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const teacherFirstName = user?.user_metadata?.first_name || "";
      const teacherLastName = user?.user_metadata?.last_name || "";
      const teacherName = `${teacherFirstName} ${teacherLastName}`.trim() || "Your Teacher";

      const payload = {
        teacher_id: user.id,
        teacher_name: teacherName,
        course_name: course?.name || `Course ${course_id}`,
        course_id_canvas: course_id,
        student_canvas_id: student.student_canvas_id,
        student_name: student.name,
        student_email: student.email,
        context: {
          inactive_days: student.inactive_days,
          attendance_days: student.attendance_days,
          attendance_risk: student.attendance_risk,
          missing_assignments_count: student.submission?.missing_assignments_count || 0,
          missing_assignments_titles: student.submission?.missing_assignments?.map(a => a.title) || [],
          current_score: student.submission?.current_score || null,
          final_score: student.submission?.final_score || null,
        }
      };

      const response = await fetch("https://victor-std-torrens.app.n8n.cloud/webhook/canvas/contact-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to generate draft");

      const data = await response.json();
      setEmailSubject(data.subject || "");
      setEmailBody(data.body || "");
    } catch (error) {
      console.error("Error generating draft:", error);
      setDraftError("We couldn't generate the draft right now. Please try again.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedStudent || !emailSubject.trim() || !emailBody.trim()) return;

    setIsSendingEmail(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Teacher email not available");

      const payload = {
        teacher_id: user.id,
        teacher_email: user.email,
        course_id_canvas: course_id,
        student_canvas_id: selectedStudent.student_canvas_id,
        student_name: selectedStudent.name,
        student_email: selectedStudent.email,
        context: {
          inactive_days: selectedStudent.inactive_days,
          attendance_days: selectedStudent.attendance_days,
          attendance_risk: selectedStudent.attendance_risk,
          missing_assignments_count: selectedStudent.submission?.missing_assignments_count || 0,
          missing_assignments_titles: selectedStudent.submission?.missing_assignments?.map(a => a.title) || [],
          current_score: selectedStudent.submission?.current_score || null,
          final_score: selectedStudent.submission?.final_score || null,
        },
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      };

      const response = await fetch("https://victor-std-torrens.app.n8n.cloud/webhook/canvas/contact-student/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send email");

      const data = await response.json();
      
      if (data.status === "sent") {
        setIsContactModalOpen(false);
        toast({
          title: "Email sent successfully!",
          description: `Your message has been sent to ${selectedStudent.name}`,
        });
      } else {
        throw new Error("Unexpected response status");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Error sending email",
        description: "There was a problem sending the email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const generateReminderDraft = async (assignment: Assignment) => {
    setIsGeneratingReminder(true);
    setReminderError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const teacherFirstName = user?.user_metadata?.first_name || "";
      const teacherLastName = user?.user_metadata?.last_name || "";
      const teacherName = `${teacherFirstName} ${teacherLastName}`.trim() || "Your Teacher";

      const payload = {
        course_name: course?.name || `Course ${course_id}`,
        teacher_name: teacherName,
        assignment: {
          assignment_id: assignment.assignment_id,
          title: assignment.title,
          due_at: assignment.due_at,
          points_possible: assignment.points_possible,
        },
      };

      const response = await fetch("https://victor-std-torrens.app.n8n.cloud/webhook/canvas/assignments/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to generate reminder draft");

      const data = await response.json();
      setReminderSubject(data.subject || "");
      setReminderBody(data.body || "");
    } catch (error) {
      console.error("Error generating reminder draft:", error);
      setReminderError("We couldn't generate the draft right now. Please try again.");
    } finally {
      setIsGeneratingReminder(false);
    }
  };

  const sendReminder = async () => {
    if (!selectedAssignment || !reminderSubject.trim() || !reminderBody.trim()) return;

    setIsSendingReminder(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("Teacher email not available");

      // Build students array with all students from the course
      const studentsPayload = students.map(student => ({
        student_canvas_id: student.student_canvas_id,
        name: student.name,
        email: student.email,
        email_available: student.email_available,
      }));

      const payload = {
        teacher_email: user.email,
        students: studentsPayload,
        subject: reminderSubject.trim(),
        body: reminderBody.trim(),
      };

      const response = await fetch("https://victor-std-torrens.app.n8n.cloud/webhook/canvas/assignments/remind/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send reminder");

      const data = await response.json();
      
      if (data.status === "sent") {
        setIsReminderModalOpen(false);
        toast({
          title: "Reminder sent successfully!",
          description: `Your reminder has been sent to all students`,
        });
      } else {
        throw new Error("Unexpected response status");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Error sending reminder",
        description: "There was a problem sending the reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const renderContactButton = (student: Student) => {
    const handleContactClick = async () => {
      const submission = submissions.find(s => s.student_canvas_id === student.student_canvas_id);
      const mergedStudent: MergedStudentData = { ...student, submission };
      
      setSelectedStudent(mergedStudent);
      setIsContactModalOpen(true);
      setEmailSubject("");
      setEmailBody("");
      setDraftError(null);
      await generateEmailDraft(mergedStudent);
    };

    if (student.email_available) {
      return (
        <Button
          size="sm"
          variant="default"
          onClick={handleContactClick}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Contact student
        </Button>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Button
                size="sm"
                variant="secondary"
                disabled
                className="gap-2 cursor-not-allowed"
              >
                <Info className="h-4 w-4" />
                Email not available
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>This student has no email confirmed in Canvas, so they cannot be contacted via email from this tool.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderLastActivity = (student: Student) => {
    const dateText = student.last_activity_at 
      ? format(new Date(student.last_activity_at), "dd MMM yyyy, hh:mm a")
      : "Never logged in";

    // Determine badge to show
    let badge = null;
    
    if (student.inactive_days && student.inactive_7_plus) {
      badge = (
        <Badge variant="destructive" className="gap-1 mt-1">
          <AlertTriangle className="h-3 w-3" />
          Inactive for {student.inactive_days} days
        </Badge>
      );
    } else if (student.last_activity_at === null && student.inactive_days && student.inactive_days >= 7) {
      // For students who never logged in but have been inactive 7+ days
      badge = (
        <Badge variant="destructive" className="gap-1 mt-1">
          <AlertTriangle className="h-3 w-3" />
          No activity
        </Badge>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span>{dateText}</span>
        {badge}
      </div>
    );
  };

  const renderAttendance = (student: Student) => {
    const { attendance_risk, attendance_days } = student;

    switch (attendance_risk) {
      case "high":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            No attendance for {attendance_days} days
          </Badge>
        );
      case "medium":
        return (
          <Badge className="gap-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500">
            <AlertTriangle className="h-3 w-3" />
            Low attendance ({attendance_days} days)
          </Badge>
        );
      case "none":
        return (
          <Badge className="gap-1 bg-green-600 hover:bg-green-700 text-white border-green-600">
            ✓ Attending
          </Badge>
        );
      case "no_attendance_yet":
      default:
        return (
          <span className="text-sm text-muted-foreground">
            Attendance data not available yet
          </span>
        );
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderAssignments = (student: Student) => {
    const studentSubmission = submissions.find(
      (sub) => sub.student_canvas_id === student.student_canvas_id
    );

    if (!studentSubmission) {
      return (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            Loading assignment data...
          </span>
        </div>
      );
    }

    const hasGrades = studentSubmission.current_score !== null || studentSubmission.final_score !== null;

    return (
      <div className="flex flex-col gap-2">
        {/* Missing assignments section */}
        {studentSubmission.has_missing_assignments ? (
          <>
            <Badge variant="destructive" className="w-fit gap-1">
              <AlertTriangle className="h-3 w-3" />
              Missing: {studentSubmission.missing_assignments_count}
            </Badge>
            <TooltipProvider>
              <ul className="text-sm space-y-1">
                {studentSubmission.missing_assignments.map((assignment) => (
                  <li key={assignment.assignment_id} className="flex items-start">
                    <span className="mr-1">•</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help hover:text-primary transition-colors">
                          {assignment.title}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-muted-foreground">
                            Due: {format(new Date(assignment.due_at), "dd MMM yyyy, hh:mm a")}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          </>
        ) : (
          <Badge variant="secondary" className="w-fit bg-green-600 hover:bg-green-700 text-white border-green-600">
            All submitted
          </Badge>
        )}

        {/* Grades section */}
        <div className="flex flex-col gap-1 text-sm mt-1">
          {hasGrades ? (
            <>
              <div>
                <span className="text-muted-foreground">Current Score: </span>
                <span className="font-medium">
                  {studentSubmission.current_score !== null ? studentSubmission.current_score : "Not available"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Final Score: </span>
                <span className="font-medium">
                  {studentSubmission.final_score !== null ? studentSubmission.final_score : "Not available"}
                </span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Grade not available yet</span>
          )}
          <a
            href={studentSubmission.grade_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs mt-1"
          >
            View grade details →
          </a>
        </div>
      </div>
    );
  };

  const getSortedStudents = () => {
    const sorted = [...students].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "last_activity":
          const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  };

  const getDueDateBadge = (assignment: Assignment) => {
    const { due_status, days_until_due, due_at } = assignment;

    if (!due_at || due_status === "no_due_date") {
      return (
        <Badge variant="secondary" className="gap-1">
          No due date
        </Badge>
      );
    }

    switch (due_status) {
      case "overdue":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue ({Math.abs(days_until_due || 0)} days ago)
          </Badge>
        );
      case "due_today":
        return (
          <Badge className="gap-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500">
            <AlertTriangle className="h-3 w-3" />
            Due today
          </Badge>
        );
      case "due_soon":
        return (
          <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500">
            Due in {days_until_due} days
          </Badge>
        );
      case "future":
        return (
          <Badge variant="secondary" className="gap-1">
            Due in {days_until_due} days
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Email Draft Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact student</DialogTitle>
            <DialogDescription>
              {selectedStudent && `Compose an email to ${selectedStudent.name}`}
            </DialogDescription>
          </DialogHeader>

          {draftError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {draftError}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                disabled={isGeneratingDraft}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              {isGeneratingDraft && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating email draft…
                </div>
              )}
              <Textarea
                id="body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email body"
                rows={12}
                disabled={isGeneratingDraft}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsContactModalOpen(false)}
              disabled={isGeneratingDraft || isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectedStudent && generateEmailDraft(selectedStudent)}
              disabled={isGeneratingDraft || isSendingEmail}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate with AI
            </Button>
            <Button
              onClick={sendEmail}
              disabled={isGeneratingDraft || isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
              className="gap-2"
            >
              {isSendingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSendingEmail ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Modal */}
      <Dialog open={isReminderModalOpen} onOpenChange={setIsReminderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send reminder</DialogTitle>
            <DialogDescription>
              {selectedAssignment && `Send a reminder about "${selectedAssignment.title}"`}
            </DialogDescription>
          </DialogHeader>

          {reminderError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {reminderError}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-subject">Subject</Label>
              <Input
                id="reminder-subject"
                value={reminderSubject}
                onChange={(e) => setReminderSubject(e.target.value)}
                placeholder="Email subject"
                disabled={isGeneratingReminder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-body">Body</Label>
              {isGeneratingReminder && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating reminder draft…
                </div>
              )}
              <Textarea
                id="reminder-body"
                value={reminderBody}
                onChange={(e) => setReminderBody(e.target.value)}
                placeholder="Email body"
                rows={12}
                disabled={isGeneratingReminder}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsReminderModalOpen(false)}
              disabled={isGeneratingReminder || isSendingReminder}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => selectedAssignment && generateReminderDraft(selectedAssignment)}
              disabled={isGeneratingReminder || isSendingReminder}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate with AI
            </Button>
            <Button
              onClick={sendReminder}
              disabled={isGeneratingReminder || isSendingReminder || !reminderSubject.trim() || !reminderBody.trim()}
              className="gap-2"
            >
              {isSendingReminder && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSendingReminder ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Course Overview</h1>
            <p className="text-muted-foreground">Course ID: {course_id}</p>
          </div>
          
          <Link to={`/courses/${course_id}/analytics`}>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students
              {!loading && <span className="text-muted-foreground text-base font-normal">({students.length})</span>}
            </CardTitle>
            <CardDescription>
              Monitor student activity and engagement levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-48" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-9 w-36" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No students found</p>
                <p className="text-sm">
                  This course doesn't have any enrolled students yet
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 hover:bg-transparent"
                          onClick={() => handleSort("name")}
                          disabled={loading}
                        >
                          Student
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 hover:bg-transparent"
                          onClick={() => handleSort("last_activity")}
                          disabled={loading}
                        >
                          Last Activity
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Assignments</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {getSortedStudents().map((student) => (
                    <TableRow key={student.student_canvas_id}>
                      <TableCell>{renderStudentInfo(student)}</TableCell>
                      <TableCell>{renderLastActivity(student)}</TableCell>
                      <TableCell>{renderAttendance(student)}</TableCell>
                      <TableCell>{renderAssignments(student)}</TableCell>
                      <TableCell>{renderContactButton(student)}</TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Upcoming & current assessments
            </CardTitle>
            <CardDescription>
              Pulled from Canvas in real time for this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-5 w-32" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No assessments found</p>
                <p className="text-sm">
                  This course doesn't have any assessments yet
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.assignment_id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <a
                              href={assignment.assignment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {assignment.title}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <span className="text-sm text-muted-foreground">
                              {assignment.points_possible !== null
                                ? `${assignment.points_possible} points`
                                : "Points: N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {assignment.due_at && (
                              <span className="text-sm">
                                {format(new Date(assignment.due_at), "dd MMM yyyy, hh:mm a")}
                              </span>
                            )}
                            {getDueDateBadge(assignment)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {assignment.total_students > 0 ? (
                              <>
                                <span className="font-medium">
                                  {assignment.submitted_count} / {assignment.total_students} submitted
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {assignment.pending_count} pending
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No students enrolled yet
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={assignment.due_status === "overdue"}
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setReminderSubject("");
                              setReminderBody("");
                              setReminderError(null);
                              setIsReminderModalOpen(true);
                              generateReminderDraft(assignment);
                            }}
                            className="gap-2"
                          >
                            <Bell className="h-4 w-4" />
                            Send reminder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseOverview;
