# Demo video script

About four minutes, recorded on the live site with the published demo login. The story
follows Priya, ACME's HR manager, through one morning that used to take a spreadsheet and
a currency converter. Speak to what each step answers, not to the code.

Before recording: run **Actions → Database → seed** on production, so the numbers match
this script's starting state, and close other tabs so the URL bar is readable.

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Login | Sign in with the demo login. | "ACME has 10,000 people in 10 countries, and today their salaries live in spreadsheets. This replaces them for the HR manager." |
| 0:20 | Directory | Let the first page load. Point at the count and the rate date. | "The directory shows 25 at a time, paged and sorted on the server. Pay is shown in each person's own currency, and in USD at one fixed rate whose date is always shown." |
| 0:40 | Directory | Type a surname, then choose **Country: India**, **Department: Engineering**. Sort by **Salary (USD)**. | "Search waits until I stop typing. Every filter goes into the URL, so I can bookmark this view or send it to someone." |
| 1:05 | Directory | Click **Export CSV**; open the file in Excel and sum the Salary column. | "The export is exactly this filtered list. Excel reads the names correctly, and salaries are plain numbers, so they add up." |
| 1:30 | Employee | Open a person from the list. | "Each person has their full salary history: when it changed, by how much, and why." |
| 1:45 | Change salary | **Change salary**, type a new amount, keep today's date, reason **Promotion**, save. | "A change needs a reason. It can't be dated before the last change or after today, and the history is append-only, so nothing is ever overwritten." |
| 2:10 | Change salary | Try again with reason **Other** and no note. | "Some rules need context: 'Other' asks for a note before anything is sent." |
| 2:25 | Mark as left | **Mark as left**, keep today's date, confirm. | "People are never deleted. A leaver keeps their history, leaves the default list and the insights, and their record becomes read-only." |
| 2:45 | Add employee | **Employees → Add employee**, pick **Japan**: the salary field switches to JPY with no decimals. Fill in and save. | "The country sets the currency, and money is entered and stored exactly, in the currency's smallest unit." |
| 3:05 | Insights | Open **Insights**. Point at the headline figures. | "Now the question HR is actually asked: how do we pay people?" |
| 3:15 | Insights | **Pay by country**: sort by **Payroll (USD)**. | "Each country in its own currency: lowest, median, average, highest. The median sits below the average because a few senior salaries pull the average up." |
| 3:35 | Insights | **Average pay by job title**: choose **India**. | "Across countries, averages mix labour markets, so it says so. Within one country it compares like for like, in rupees." |
| 3:50 | Insights | **Pay distribution**: choose **Japan**. | "How spread out pay is, with the 10th to 90th percentiles. They follow Excel's PERCENTILE.INC, so anyone can check them." |
| 4:05 | – | End on the Insights page. | "The code, tests, decisions and how AI was used are in the repository's README." |

Keep it to one take per row; cut between rows. If a step fails on camera, re-record that
row rather than explaining around it.
