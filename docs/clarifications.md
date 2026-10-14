# Clarifications & working assumptions

The email that came with the assessment asks candidates to clarify rather than assume
("Ask Questions — Don't Assume"). So before writing the requirements I emailed the
recruiting team on **13 Oct 2026** with the questions below.
Each question carried the assumption I would work with if I heard nothing, so progress
would not block on the reply.

**Status (14 Oct 2026):** no reply after 24 hours. I am proceeding with the assumptions
below. If an answer arrives that changes one of them, I will log it here, along with the
commit that adjusts the system.

| # | Question | Working assumption |
|---|----------|--------------------|
| 1 | **Currency.** Should salaries be stored in each employee's local currency? For org-wide comparisons, is a fixed exchange-rate table (with a documented as-of date) enough, or are live rates preferred? | Store salaries in local currency. Use a static exchange-rate table and convert to USD for org-wide metrics. |
| 2 | **Salary scope & history.** Is "salary" strictly annual gross base pay, or should it include bonuses, allowances or tax deductions? Should the system track historical salary changes? | Annual gross base pay only. Every salary update is recorded in a history (date and reason). |
| 3 | **Core metrics.** Which metrics does the HR manager need most? | Min / max / average by country, average by job title, payroll cost by department, and salary distribution by country. |
| 4 | **Roles & access.** One HR user or several roles? Is authentication required on the deployed app? | A single HR role with basic authentication. No role-based access control. |
| 5 | **Import / export.** The data lives in spreadsheets today. Is CSV import or export required? | CSV export is in scope. CSV import is a stretch goal. |
| 6 | **Timeline.** Is there a submission deadline? | None stated. The email says faster submissions are prioritised, so I aim to submit as soon as the scope is done well. |

## Questions I chose not to ask

- **Tech stack and hosting.** The brief already says to use the role's stack (Node /
  TypeScript, React) and names SQLite as an acceptable relational database, so this
  was not a real ambiguity.
