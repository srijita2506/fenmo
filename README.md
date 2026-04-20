# Personal Expense Tracker

A minimal full-stack expense tracker built to demonstrate data correctness, reliability in unreliable network conditions, and foundational API design.

## Live Demo
* **Frontend (Vercel):** [https://fenmo-six.vercel.app/](https://fenmo-six.vercel.app/)
* **Backend API (Render):** [https://fenmo-csx5.onrender.com/expenses](https://fenmo-csx5.onrender.com/expenses)

## Key Design Decisions
1. **Handling Network Failures (Idempotency):** To solve the issue of users double-clicking submit or the network dropping out, the frontend generates a UUID (`Idempotency-Key`) for every form submission. The SQLite backend checks this key against a `UNIQUE` constraint. If a duplicate request arrives, the API gracefully returns the existing record instead of creating a duplicate charge.
2. **Handling Money:** Floating-point math is notoriously inaccurate for monetary calculations. The API accepts standard decimal values (e.g., ₹10.50), but strictly converts and stores them as integers representing the smallest currency unit (e.g., 1050 paise/cents) in the SQLite database. The frontend converts it back for display.
3. **Database Choice:** SQLite (`better-sqlite3`) was chosen over an in-memory array or JSON file because it is a real relational database. It ensures data consistency, supports robust queries (filtering/sorting), handles unique constraints for our idempotency keys, and persists across restarts without requiring Docker or a separate DB server.

## Trade-offs Made
* **Authentication/Users:** Removed entirely to stay within the timebox. The tool assumes a single-tenant environment.
* **Pagination:** The `GET /expenses` endpoint returns the entire list. For a production system over time, cursor-based or offset pagination would be necessary.
* **Complex State Management:** Used basic React `useState` and `useEffect` instead of Redux or React Query to minimize bundle size and dependencies.

## What I Intentionally Did Not Do
* **Updating and Deleting:** The CRUD scope was restricted to Create and Read to focus purely on the core requirements and idempotency robustness.
* **Elaborate Styling:** Kept CSS barebones (inline styles) to prioritize the logical requirements, error boundaries, and data correctness over aesthetics.
