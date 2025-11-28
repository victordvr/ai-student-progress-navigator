-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.canvas_connections (
  id bigint NOT NULL DEFAULT nextval('canvas_connections_id_seq'::regclass),
  teacher_id uuid NOT NULL UNIQUE,
  token_encrypted text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last4 text,
  CONSTRAINT canvas_connections_pkey PRIMARY KEY (id),
  CONSTRAINT canvas_connections_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  course_id_canvas text NOT NULL,
  student_canvas_id bigint NOT NULL,
  student_email text,
  subject text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'email'::text,
  inactive_days_at_send integer,
  missing_assignments_count_at_send integer,
  current_score_at_send numeric,
  final_score_at_send numeric,
  attendance_risk_at_send text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_sent_pkey PRIMARY KEY (id)
);
CREATE TABLE public.monitored_courses (
  id bigint NOT NULL DEFAULT nextval('monitored_courses_id_seq'::regclass),
  teacher_id uuid NOT NULL,
  course_id_canvas bigint NOT NULL,
  course_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monitored_courses_pkey PRIMARY KEY (id),
  CONSTRAINT monitored_courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  role text DEFAULT 'teacher'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.student_daily_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id_canvas text NOT NULL,
  teacher_id text NOT NULL,
  student_canvas_id bigint NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp with time zone,
  inactive_days integer,
  inactive_7_plus boolean,
  last_attended_at timestamp with time zone,
  attendance_days integer,
  attendance_risk text,
  missing_assignments_count integer,
  has_missing_assignments boolean,
  current_score numeric,
  final_score numeric,
  student_name text,
  student_email text,
  CONSTRAINT student_daily_snapshots_pkey PRIMARY KEY (id)
);