```markdown
# TaskVault

**Live Demo:** [taskvault-learn.vercel.app](https://taskvault-learn.vercel.app)

TaskVault is an integrated skill-credentialing and freelance bounty marketplace. It bridges the gap between theoretical technical education and real-world execution by merging a Learning Management System (LMS) with an escrow-backed freelance board.

Students must complete technical courses to earn Reputation Points (RP) and Skill Badges. Only after proving their competence can they unlock and apply to corporate bounties to earn actual fiat currency.

## 🏛️ Architecture

* **Frontend:** Next.js 15 (App Router), React, Tailwind CSS
* **Backend:** Next.js API Routes (Serverless)
* **Database:** MySQL (Strictly Normalized to 3NF)
* **Rich Text:** Tiptap Editor
* **Deployment:** Vercel

## ⚙️ Core Features

### 1. Role-Based Ecosystem

A single, centralized architecture securely handles four distinct user types:

* **Students:** Consume courses, earn RP, apply for bounties, and get paid.
* **Corporate Clients:** Post tasks, manage escrow funds, review applicants, and release payouts.
* **Instructors:** Build and manage multi-module courses with embedded media and quizzes.
* **Admins:** Oversee the platform, manage users, and handle instructor applications.

### 2. The Verification Pipeline (LMS)

* **Course Builder:** Instructors construct dynamic courses.
* **Progress Tracking:** Enforced natively at the database level via composite primary keys and `ON DUPLICATE KEY UPDATE` (Upsert) logic to prevent exploit spamming.
* **Reputation Engine:** Completing courses automatically injects RP into the student's metrics, unlocking access to higher-tier bounties.

### 3. Escrow-Backed Bounty Board

* **Secure Posting:** Corporate clients post tasks, immediately freezing the reward amount from their wallet into an escrow hold.
* **Hiring Queue:** Clients review applicants based on verified RP, completed tasks, and past ratings.
* **Review Studio & Payouts:** Students submit work. Corporates rate the submission. Approval triggers an atomic SQL transaction, safely routing funds from escrow to the student's available balance.

### 4. Advanced Database Implementation

* **Strict Normalization:** 1NF through 3NF adhered to across 17 interconnected tables.
* **Data Integrity:** Enforced natively via `ON DELETE CASCADE`, `ON DELETE SET NULL`, and composite unique constraints.
* **Performance:** Complex dashboard queries utilize `Promise.all` concurrent fetching, `LEFT JOIN` aggregations, and composite B-Tree indexing.
* **Automation:** SQL Triggers handle audit logging and wallet creation, ensuring structural integrity independent of the JavaScript application layer.

## 💻 Getting Started (Local Development)

### Prerequisites

* Node.js 18+
* MySQL Server (XAMPP, Docker, or standalone)

### 1. Clone & Install

```bash
git clone [https://github.com/your-username/taskvault.git](https://github.com/your-username/taskvault.git)
cd taskvault
npm install

```

### 2. Database Setup

1. Open phpMyAdmin or your MySQL CLI.
2. Create a new database named `taskvault_db`.
3. Import the provided schema file: `taskvault_db.sql`.

### 3. Environment Variables

Create a `.env.local` file in the root directory and configure your database connection:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=taskvault_db

```

### 4. Run the Development Server

```bash
npm run dev

```

Open http://localhost:3000 in your browser.

## 🛡️ Security Notes

* **Simulated Ledger:** This project currently simulates financial transactions and escrow holds within the internal MySQL ledger. It is not connected to a live payment processor (e.g., Stripe) in its current state.
* **Authentication:** Handled via custom JWT/Session cookies integrated directly with the MySQL `users` table.
* **Authorization:** Backend API routes enforce strict role-checks and ID-matching to prevent cross-account mutation.
