<div align="center">
  <h1>🚀 SafeX Jobs Platform</h1>
  <p>A comprehensive, end-to-end recruitment and job management ecosystem.</p>

  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Supabase-18181F?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
</div>

---

## 🌟 Overview

**SafeX Jobs** is a modern, unified recruitment application bridging the gap between top-tier talent and leading organizations. Built with a scalable architecture, the platform features a secure, multi-role routing system providing dedicated dashboard experiences for **Candidates**, **Companies**, **Hiring Managers**, and **Administrators**.

## ✨ Features by Role

### 👨‍💻 Candidate Experience
- **Advanced Profiles:** Complete profiles featuring structural Career Objectives, Skills, CV uploads, and Video Introduction capabilities.
- **Job Discovery Gallery:** Rich search and filter interface to find roles by location, remote-status, and industry.
- **Visual Application Tracker:** A real-time timeline tracking applications from *Applied* to *In Review*, and *Interviewing*.

### 🏢 Company & 👔 Hiring Manager Experience
- **Recruiting Dashboard:** Instant overview of company hiring analytics, active listings, and candidate metrics.
- **Job Creation:** Robust job post builder with localized requirements, salary boundaries, and tags.
- **Candidate Review Engine:** Intelligent applicant feed displaying auto-matched scoring, direct video-intro playbacks, and one-click Shortlist/Reject actions.
- **Recruitment Team Management:** Companies can uniquely invite internal Hiring Managers and assign them to specific open positions.

### 🛡️ System Administration
- **Global Oversight:** Enterprise-level dashboard tracking platform-wide metrics.
- **Verification Portal:** securely verify and approve joining organizations to maintain platform integrity.

---

## 🛠️ Technology Stack

- **Frontend Framework:** [React Native](https://reactnative.dev/) powered by [Expo](https://expo.dev/)
- **Routing:** [Expo Router v3](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Backend as a Service:** [Supabase](https://supabase.com/) (PostgreSQL Database, Authentication, RLS, Storage)
- **Styling:** Custom StyleSheet / Vanilla React Native design system focusing on Dark-mode aesthetics (`#0f172a`, `#1e293b`).

---

## 🚀 Quick Setup & Installation

Follow these steps to get the project running beautifully on your local machine.

### 1. Clone & Install
```bash
# Install the project dependencies securely
npm install
```

### 2. Environment Configuration
Create a `.env` file at the root of your project and insert your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Initialization
Go to your Supabase SQL Editor and run the following unified execution script to securely build your `profiles` architecture:

```sql
-- Create the profiles table securely
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('candidate', 'company', 'admin', 'hiring_manager')),
  email text,
  full_name text,
  phone text,
  company_name text,
  province text,
  city text,
  industry text,
  cnic text,
  website text,
  company_location text,
  company_description text,
  registration_info text,
  logo_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and establish security policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ( auth.uid() = id );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ( auth.uid() = id );
```

### 4. Start the Application
```bash
# Start the Expo Dev Server
npx expo start

# Press 'w' to view on web, 'a' for Android, or 'i' for iOS!
```

---

## 📂 Project Structure

```bash
📦 SafeXJobs/src
 ┣ 📂 app
 ┃ ┣ 📂 (auth)        # Global Login & Dynamic Registration
 ┃ ┣ 📂 (candidate)   # Secure Subsystem context for Candidates
 ┃ ┣ 📂 (company)     # Secure Subsystem context for Companies/HMs
 ┃ ┣ 📂 (admin)       # System Administration Dashboard
 ┃ ┣ 📜 _layout.tsx   # Core Role-Based Navigation Engine
 ┃ ┗ ...
 ┣ 📂 components      # Shared UI Widgets
 ┗ 📂 lib
   ┣ 📜 AuthProvider.tsx  # Centralized Session & Role State
   ┗ 📜 supabase.ts       # Database & Cloud Client
```

---
<div align="center">
  <p>Engineered for the future of recruiting. ✨</p>
</div>
