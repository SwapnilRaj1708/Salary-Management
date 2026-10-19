# Clarifications & working assumptions

The email that came with the assessment asks candidates to clarify rather than assume
("Ask Questions — Don't Assume"). So before writing the requirements I emailed the
recruiting team on **13 Oct 2026** with the questions below.
Each question carried the assumption I would work with if I heard nothing, so progress
would not block on the reply.

**Status:**
- **14 Oct 2026:** no reply after 24 hours, so I started planning on these assumptions.
- **19 Oct 2026:** the recruiting team replied and confirmed all five. No design change
  was needed.

They also asked that the docs explain why these metrics were chosen. That explanation is
in [architecture.md §6](architecture.md#6-metrics-why-these-and-how-they-are-defined).

| # | Question | Working assumption | Reply (19 Oct) |
|---|----------|--------------------|----------------|
| 1 | **Currency.** Should salaries be stored in each employee's local currency? For org-wide comparisons, is a fixed exchange-rate table (with a documented as-of date) enough, or are live rates preferred? | Store salaries in local currency. Use a static exchange-rate table and convert to USD for org-wide metrics. | Confirmed. A static table with a documented as-of date is enough; live rates are not needed. |
| 2 | **Salary scope & history.** Is "salary" strictly annual gross base pay, or should it include bonuses, allowances or tax deductions? Should the system track historical salary changes? | Annual gross base pay only. Every salary update is recorded in a history (date and reason). | Confirmed. |
| 3 | **Core metrics.** Which metrics does the HR manager need most? | Min / max / average by country, average by job title, payroll cost by department, and salary distribution by country. | Confirmed as a good starting point. I may refine the set, and should explain the choice in the docs. |
| 4 | **Roles & access.** One HR user or several roles? Is authentication required on the deployed app? | A single HR role with basic authentication. No role-based access control. | Confirmed. |
| 5 | **Import / export.** The data lives in spreadsheets today. Is CSV import or export required? | CSV export is in scope. CSV import is a stretch goal. | Confirmed. |
| 6 | **Timeline.** Is there a submission deadline? | None stated. The email says faster submissions are prioritised, so I aim to submit as soon as the scope is done well. | Not addressed. The working assumption stands. |

## Questions I chose not to ask

- **Tech stack and hosting.** The brief already says to use the role's stack (Node /
  TypeScript, React) and names SQLite as an acceptable relational database, so this
  was not a real ambiguity.
