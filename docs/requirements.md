# Salary Management v1: Requirements

**Goal.** Replace ACME's salary spreadsheets with a web app. In it, the HR manager keeps
salary records for about 10,000 employees across countries correct, and answers "how do
we pay people?" in a couple of clicks. Today, inconsistent job titles break averages,
there is no reliable salary history, and currencies are converted by hand.

**Assumptions** ([sent to the recruiter, unanswered](clarifications.md)): salaries are
stored in local currency, with static USD rates for org-wide figures. Salary means annual
gross base pay, with a history of changes. One HR role signs in with an email and
password (not HTTP Basic). CSV export is in scope; CSV import is a stretch goal.

## In scope

1. **Access.** Sign in and sign out. Every other API call needs a session.
2. **Directory for 10,000 rows.** Search, filter (country, department, title, status),
   sort and paginate, all on the server.
3. **Records.** Add an employee with a starting salary, edit details, mark someone as left.
4. **Salary changes.** Amount, effective date and reason, kept as append-only history.
5. **Insights.** Min, median, average and max by country; average by job title; payroll
   by department; distribution per country. Single-country figures are in local
   currency; cross-country figures are in USD, labelled with the rates' date.
6. **Export.** The filtered list as a CSV that Excel opens correctly. Import with a
   validating dry run is a stretch goal.
7. **Seed script.** 10,000 employees in 10 countries, the same data on every run.
   Department and title lists are fixed to keep groupings clean.

## Deliberately left out, and why

- **Bonuses, deductions, payroll runs and tax.** Country-specific rules would make metrics
  ambiguous, and payroll is a separate, compliance-heavy product.
- **Live exchange rates.** Static rates keep the figures reproducible and testable.
- **More roles, SSO and password reset.** There is only one persona.
- **Future-dated raises and moves between countries.** Current salary would depend on
  the date, and currency would change partway through someone's history.
- **Gender and pay-equity analysis.** This is sensitive data with different legal rules
  in each country, and raw pay gaps mislead. Top v2 candidate.
- **Pay bands, trends, approvals, org charts, deleting people.** No v1 question needs
  them. Leavers keep their history, which makes trends possible later.

## Success criteria

- Every core pay question is answered within two clicks of the Insights page, and a
  country's figures match Excel's results on its CSV export.
- With 10,000 employees deployed, list and insights responses take under 300 ms (p95).
- The API enforces every business rule, and fast, repeatable tests in CI cover each one.
