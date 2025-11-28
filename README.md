# AI Student Progress Navigator

This repository contains the prototype of an early-intervention system designed to help lecturers monitor student progress in Canvas more efficiently.
The goal is to centralise key indicators—such as inactivity, missing work, performance changes, and upcoming deadlines—into a single, easy-to-use dashboard.

The project integrates several modern tools and services and prioritises a backend-first, modular design.

## 🚀 Core Technologies
### Backend & Automation

- **n8n** – orchestrates all business logic
- **Canvas API** – retrieves enrolments, submissions, grades, and activity
- **Gmail API **– sends lecturer-approved messages
- **OpenAI API** – generates optional email drafts
- **Supabase** – stores encrypted tokens, daily snapshots, cached values, and logs

### Frontend

- **Lovable** – used to rapidly build the UI for lecturers
- Minimalistic dashboard that consumes the processed backend data

## 🧱 Repository Structure


    backend/
    	n8n-workflows/        # exported workflows & subflows
    
    frontend/
     	lovable-app/          # Lovable UI application (dashboard)
    
    database/
     	supabase/             # schema, seed files, RLS policies (coming next)
    
    docs/
     	system-diagram/       # architecture diagram(s)
     	screenshots/          # UI, workflows, Supabase views

## 📊 Key Features

- Automated retrieval & merging of Canvas data
- Inactivity detection
- Missing/late assessment tracking
- Basic performance trend detection
- Daily snapshots stored in Supabase
- Lecturer-initiated communication workflows
- Optional AI-assisted email drafts
- Modular & extensible architecture

The system maintains lecturer control at all times—no messages are sent automatically.

## 🔒 Security Considerations

- Canvas tokens stored encrypted in Supabase
- Token decryption occurs only at runtime in the backend
- UI never interacts with sensitive tables directly
- RLS (Row-Level Security) planned for full role-based access
- Clear separation of frontend, backend, and database layers

## 🧪 Running the System (Prototype)

To run this system in a real environment, the following components are required:

- A Canvas teacher account
- A Supabase project
- An n8n instance (cloud or local)
- Valid API keys for Gmail and OpenAI
- Environment variables configured for all services

Future updates may include Docker-based setup instructions.

## 📌 Status

This is an academic prototype built for the ITW601 Industry Project assessment.
Core functionality is complete, and the system is ready for future expansion such as:

- predictive analytics using historical data
- expanded Canvas permissions
- Microsoft Graph integrations
- automated attendance analysis