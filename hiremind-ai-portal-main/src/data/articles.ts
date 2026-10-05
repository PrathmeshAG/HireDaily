export type Article = {
  slug: string; title: string; description: string; category: string;
  /** Go-live date (YYYY-MM-DD). The article is hidden everywhere until this day, so releases can be spread over weeks. */
  published: string;
  /** Set ONLY when you really revised the article. Shown as "Updated ..." when it differs from published. */
  updated?: string;
  /** Optional first-hand note from the author (real examples or experience). Shown in its own box when present. */
  authorNote?: string;
  body: string;
};

/**
 * Body format (plain text):
 *   "## Heading"     -> section heading
 *   "- item" lines   -> bullet list
 *   "~~~ ... ~~~"    -> code block (no blank lines inside)
 *   anything else    -> paragraph
 */
export const ARTICLES: Article[] = [
  {
    slug: "data-analyst-fresher-interview-questions",
    title: "Data Analyst Fresher Interview Questions and How to Answer Them",
    description: "The SQL, Excel, statistics, Python and Power BI questions freshers get in data analyst interviews, with clear example answers and a one-week preparation plan.",
    category: "Interview preparation",
    published: "2026-10-03",
    body: `A data analyst interview for a fresher is rarely about clever tricks. Interviewers want to know three things: can you work with data using basic tools, can you think clearly about a business question, and can you explain your answer in simple words. This guide walks through the questions that come up most often and shows how to answer each one so that you sound prepared but natural.

## How the interview is usually structured

Most companies run two or three rounds. The first is often an online test or screening call covering SQL, Excel and aptitude. The second is a technical discussion where someone reviews your projects and asks follow-up questions. The last round is a manager or HR conversation about communication, teamwork and your plans. Knowing this helps you split your preparation time instead of studying everything at once.

## SQL questions you should expect

SQL is the most common skill tested for freshers, so practise it daily. Typical questions include:

- What is the difference between WHERE and HAVING?
- Explain INNER JOIN, LEFT JOIN and FULL JOIN with a small example.
- How do you find duplicate records in a table?
- What is a window function and when would you use RANK or ROW_NUMBER?
- How do you find the second highest salary?

A good answer to the WHERE and HAVING question is short and exact: WHERE filters individual rows before grouping, while HAVING filters groups after aggregation, so it can use functions such as SUM or COUNT. For duplicates, show that you understand grouping:

~~~
SELECT email, COUNT(*) AS times
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
~~~

When you write a query in an interview, say your plan first: which table you start from, what you filter, and what you group by. Interviewers score your thinking as much as the final syntax.

## Excel and spreadsheet questions

Excel questions are practical. You may be asked to explain XLOOKUP or VLOOKUP, build a pivot table from a sample sheet, or clean messy text data. Be ready to explain when a pivot table is better than a formula, how SUMIFS differs from SUMIF, and how you would remove duplicates or handle blank cells. If you have used Excel in a college project or internship, describe exactly what you cleaned and what decision the result supported.

## Statistics questions

You do not need advanced mathematics, but you must know the basics well. Be able to explain mean, median and mode, and say when the median is the better measure, for example with salaries that contain a few very high values. Know what standard deviation tells you, what a correlation is, and why correlation does not prove causation. If asked about a p-value, a safe answer is that it shows how likely your result would be if there were really no effect, and a small value suggests the result is unlikely to be pure chance.

## Python and pandas questions

If your resume lists Python, expect questions on lists and dictionaries, loops, and pandas. Common ones are how to read a CSV file, how to find missing values, how groupby works, and how merge compares with an SQL join. A strong answer mentions the actual methods, such as read_csv, isna, fillna, groupby and merge, and explains why you chose one approach, for instance filling missing ages with the median instead of the mean.

## Power BI or Tableau questions

For visualisation tools, interviewers look for good design judgement. Be ready to explain what a measure is, why a star schema keeps reports fast, and how you would choose a chart. Use a line chart for trends over time, a bar chart to compare categories, and avoid pie charts with many slices. A dashboard should answer one clear question and use few colours.

## Business and case questions

Case questions test thinking, not memory. A common example is: sales dropped by twenty percent last month, how would you investigate? A good approach is to confirm the data is correct, then break the drop down by product, region, channel and customer type, compare with the same period last year, check for events such as price changes or stock shortages, and finally suggest next steps. Speak in steps and invite the interviewer to correct your assumptions.

## Questions about your projects

Every fresher is asked about projects, so know yours deeply. Be ready to explain where the data came from, what problems you found while cleaning it, which method you used and why, and what insight you found. If you cannot explain a project in two minutes, simplify it before the interview.

## Common mistakes to avoid

- Memorising answers word for word instead of understanding the idea.
- Writing SQL silently without explaining your approach.
- Listing tools on your resume that you cannot discuss.
- Giving a long answer when the interviewer wanted a short definition.
- Saying you do not know without trying. It is fine to say, I am not sure, but I would start by checking the table structure.

## A simple one-week plan

On days one and two, revise SQL joins, grouping and window functions with ten practice queries each. On day three, practise Excel pivot tables and lookup formulas. On day four, review statistics basics and write one-line explanations in your own words. On day five, revisit your two best projects and prepare a two-minute summary for each. On day six, practise two case questions out loud. On day seven, do a full mock interview with a friend and note which answers felt weak.

## Final advice

Confidence in a fresher interview comes from clarity, not from knowing everything. Answer in plain language, give small examples, and be honest about what you are still learning. Keep practising on real datasets, and use the interview questions section on Hire Daily to test yourself regularly.`,
  },
  {
    slug: "ats-resume-guide-for-freshers",
    title: "ATS Resume Guide for Freshers: How to Get Past the Screening Software",
    description: "A practical guide for freshers on writing an ATS-friendly resume: format, keywords, sections, common mistakes and a simple checklist to use before you apply.",
    category: "Resume and career",
    published: "2026-10-03",
    body: `Many companies use an Applicant Tracking System, or ATS, to collect and organise job applications. For freshers, this software can feel like a locked door. The good news is that an ATS is not magic. It reads your resume as text, compares it with the job description, and helps a recruiter search and sort candidates. If your resume is clean and relevant, it works in your favour. This guide explains how to write one.

## What an ATS actually does

An ATS stores resumes, extracts details such as name, education and skills, and lets recruiters search by keywords. Some systems also rank or filter applications. It does not judge your personality, and it usually does not reject people automatically for small formatting issues, but a resume that cannot be read properly may be extracted incorrectly, which means a recruiter may never see your skills. Your job is to make the resume easy for both software and humans to read.

## Choose a simple layout

Use a single-column layout with standard fonts such as Arial, Calibri or Times New Roman at ten to twelve points. Keep margins reasonable and use plain bullet points. Avoid:

- Tables, text boxes and multi-column designs, which can scramble the reading order.
- Photos, icons and graphics, which add no value for the software.
- Putting key details such as your phone number inside the header or footer of the document.
- Skill rating bars. They cannot be read as text and say little to a recruiter.

Save the file as a PDF unless the employer asks for Word. A text-based PDF is read well by most systems, but do not use a scanned image of your resume.

## Use standard section headings

Software looks for familiar headings. Use clear names such as Summary, Education, Skills, Projects, Experience or Internships, and Certifications. Creative titles like My Journey or What I Know may confuse the parser. For a fresher, a good order is contact details, a short summary, skills, projects, education, and then internships or certifications.

## Write a short, specific summary

Two or three lines are enough. Mention your degree, your target role, and your strongest skills. For example: Computer science graduate with hands-on experience in SQL, Excel and Power BI, seeking an entry-level data analyst role. Built three dashboards using public datasets. Avoid empty phrases such as hard-working team player unless you can support them with proof elsewhere on the page.

## Match keywords honestly

Read the job description and notice the repeated skills and tools. If the posting asks for SQL, Excel and data visualisation and you have used them, make sure those exact words appear in your skills section and in your project descriptions. Do not add tools you have never used. Interviewers will ask about everything on your resume, and being caught out costs more than a missing keyword. Use both the full name and the abbreviation when helpful, for example Search Engine Optimisation (SEO).

## Make projects the strongest part

Freshers often have little work experience, so projects carry the resume. For each project, write a title, the tools used, and two or three bullet points that show what you did and what happened. Start each bullet with an action verb and include a result or a number where it is honest.

- Weak: Made a sales dashboard.
- Better: Built a Power BI sales dashboard from 12 months of retail data, showing revenue by region and product so that the slowest category was visible at a glance.

If you cannot share exact numbers, describe the size of the data or the decision it supported instead of inventing figures.

## Education, certifications and internships

List your degree, college, year of passing and your score in the format your college uses. Add certifications only if they are relevant to the role and you completed them. Include internships, training programmes and even strong academic projects done with a team, and say clearly what your own part was.

## Keep it to one page

For a fresher, one page is the best length. Recruiters spend very little time on each resume, so remove anything that does not support the job you are applying for. Cut old school details, long hobby lists and generic objectives.

## Common mistakes freshers make

- Sending the same resume for every role without adjusting the skills and summary.
- Using an unusual file name. Use something clear like Firstname_Lastname_Resume.pdf.
- Spelling mistakes and inconsistent date formats.
- Using a personal email address that looks unprofessional.
- Copying the job description word for word, which looks dishonest.

## A quick checklist before you apply

Check that your name, phone number and email are at the top and readable as text. Confirm that headings are standard and the layout is one column. Make sure the main skills from the job description appear naturally, that each project has results or clear outcomes, and that the file opens correctly on a phone and a computer. Copy all the text from the PDF into a plain text editor. If the order looks right and nothing is missing, most systems will read it well too.

## Final thoughts

An ATS-friendly resume is simply a clear, honest and well-organised resume. Focus on being specific about what you can do, and improve it after every few applications based on what you learn. Pair it with solid interview practice and your chances improve far more than any formatting trick could.`,
  },
  {
    slug: "fresher-jobs-in-pune-guide",
    title: "How to Find Fresher Jobs in Pune: A Practical Guide for 2026",
    description: "A practical guide to finding fresher jobs in Pune: where the IT hubs are, which roles to target, how to search, how to prepare and how to avoid job scams.",
    category: "Job search guide",
    published: "2026-10-03",
    body: `Pune is one of the most popular cities in India for fresh graduates who want to start a career in technology, analytics, engineering and services. The city has a large student population, many colleges and a wide mix of companies, from established IT services firms to start-ups and product teams. That also means plenty of competition, so a planned search works far better than applying randomly. This guide explains how to approach a fresher job search in Pune step by step.

## Understand the job market first

Pune offers entry-level roles across several areas. The most common are software development and testing, data and business analytics, technical support, cloud and infrastructure, cyber security, and business process roles. There are also openings in manufacturing and automotive engineering, which have long been a part of the city's economy. Start by choosing one or two directions that match your degree and skills instead of applying to everything. A focused profile is easier for recruiters to understand.

## Know the main work areas

Many technology companies are clustered in well-known areas such as Hinjewadi, Kharadi, Magarpatta, Baner, Viman Nagar and Hadapsar. Knowing where jobs are located matters because commuting time affects your daily life and cost. Before you accept an offer, check the office location, shift timings and travel options, and compare them with where you plan to live. Some roles are remote or hybrid, and the listing should say so.

## Build a skills profile employers can verify

Freshers are hired on potential, but potential needs proof. Recruiters look for a clear skills section, two or three solid projects, and any internships or certifications. Pick tools that match the role:

- For development: one programming language, data structures basics, Git and a small deployed project.
- For data roles: SQL, Excel, Python basics and a dashboard or analysis project.
- For testing: manual testing concepts, test case writing and an introduction to automation.
- For support and cloud roles: networking basics, Linux commands and cloud fundamentals.

Publish your work on GitHub or a simple portfolio so that anyone can check it. Keep your resume to one page and write it for the role you are targeting.

## Use more than one search channel

Relying on a single website limits your chances. Combine several sources:

- Job listing websites and the career pages of companies, where roles are posted first.
- Off-campus drive announcements, which are common for freshers and often have a clear deadline.
- Professional networks such as LinkedIn, where you can follow companies and connect with alumni.
- Local communities, college placement cells and meet-ups, where referrals often start.

When you find a job on any website, try to confirm it on the company's own careers page. Official sources are the safest way to apply, which is also why Hire Daily shows the source and application link for each listing.

## Apply carefully, not in bulk

Read the job description fully before applying. Check the eligibility criteria such as degree, year of passing and minimum percentage, the location, the deadline and the documents required. Adjust the top of your resume so that the skills the company asked for are visible. Ten careful applications usually bring better results than a hundred rushed ones. Keep a simple tracker with the company, role, date, link and status, so you can follow up politely after a week or two.

## Prepare for the usual selection process

Most fresher hiring in Pune follows a similar path: an online assessment, one or two technical interviews, and an HR discussion. The assessment often includes aptitude, logical reasoning and basic coding or SQL. For technical rounds, revise your core subjects and your projects. For the HR round, prepare answers about yourself, your strengths, why you chose the company and whether you are comfortable with the location and shifts. Practise speaking aloud with a friend, because clear communication is often what separates similar candidates.

## Be careful about job scams

Unfortunately, fresher job seekers are often targeted by fake offers. Protect yourself with a few simple rules:

- A genuine employer does not ask you to pay for an interview, a laptop, training or an offer letter.
- Be cautious of messages that promise high pay for very little work or ask you to move to a private chat app immediately.
- Verify the company name, website and email domain. Official emails usually come from the company domain, not from free email accounts.
- Never share bank passwords, OTPs or card details during hiring.

If something feels wrong, check the company's official careers page or contact their official HR email before sharing documents.

## Think about salary and growth

Entry-level pay varies widely by company, role and skills, so avoid relying on a single number you saw online. Compare the whole package: base pay, any variable component, notice period and bond terms, learning opportunities and the quality of the team. In your first job, the skills you build and the manager you learn from matter as much as the starting salary. If a listing shows an expected salary, remember that it is not a confirmed offer.

## Keep improving while you search

A job search can take weeks or months. Use the waiting time well. Learn one new skill each month, add a small project, and take mock interviews. Update your resume after each improvement. Ask for feedback if you are rejected after an interview and note the topics that need work.

## Final words

Finding a fresher job in Pune is a mix of preparation, patience and smart searching. Choose a clear direction, build proof of your skills, apply with care through trustworthy sources and keep learning. With steady effort, your first opportunity is closer than it feels.`,
  },
  {
    slug: "sql-interview-questions-for-freshers",
    title: "SQL Interview Questions for Freshers With Simple Answers",
    description: "The SQL questions freshers are asked most often, from joins and GROUP BY to window functions, each with a clear answer, a small example and tips for explaining your thinking.",
    category: "Interview preparation",
    published: "2026-10-21",
    body: `SQL is the one skill that shows up in almost every analyst, developer and testing interview for freshers. The questions are rarely tricky, but interviewers pay close attention to how clearly you explain your approach. This guide covers the questions that appear again and again, with short answers you can adapt in your own words and small examples you can try on any practice database.

## Start with the basics

Most interviews begin with definitions. Be ready to explain what SQL is, which is a language used to read and manage data stored in relational databases, and what a table, row and column are. Know the difference between a primary key, which uniquely identifies each row and cannot be empty, and a foreign key, which links a row to the primary key of another table. If you can describe a simple example, such as a customers table and an orders table connected by customer id, you will sound confident.

## DELETE, TRUNCATE and DROP

This question tests whether you understand the effect of each command. DELETE removes selected rows and can use a WHERE condition. TRUNCATE removes all rows from a table quickly but keeps the table structure. DROP removes the whole table, including its structure. A good extra point is that DELETE can usually be rolled back inside a transaction, while TRUNCATE and DROP are more drastic and should be used carefully.

## WHERE and HAVING

WHERE filters rows before they are grouped. HAVING filters the groups after aggregation. Because of this, you cannot use a function such as SUM in WHERE, but you can in HAVING. A short example makes the answer memorable:

~~~
SELECT city, SUM(amount) AS revenue
FROM orders
WHERE status = 'Paid'
GROUP BY city
HAVING SUM(amount) > 50000;
~~~

Here the paid orders are selected first, then grouped by city, and only the cities with revenue above fifty thousand are kept.

## Joins explained simply

An INNER JOIN returns only the rows that have a match in both tables. A LEFT JOIN returns every row from the left table and the matching rows from the right table, with empty values where there is no match. A RIGHT JOIN is the opposite, and a FULL JOIN returns everything from both sides. A common follow-up is how to find customers who have never placed an order. The answer is a LEFT JOIN from customers to orders with a condition that the order id is empty.

- Use INNER JOIN when you only care about matching records.
- Use LEFT JOIN when you want to keep every record from the main table.
- After any join, compare the row count with what you expected. A sudden increase usually means a one-to-many relationship.

## Finding duplicates and removing them

Interviewers love this because it combines grouping and filtering. To find duplicates, group by the column that should be unique and keep the groups that appear more than once using HAVING COUNT greater than one. To remove them, you can use a window function such as ROW_NUMBER to number the rows inside each group and then delete the ones numbered above one. Even if you do not remember the exact syntax, explain the idea clearly.

## The second highest salary

This classic question has several valid answers. One approach selects the maximum salary that is lower than the overall maximum. Another uses a window function, giving each salary a rank and picking rank two. Mention that DENSE_RANK is safer than RANK when several people can share the same salary, because RANK leaves gaps after ties.

## Window functions

Window functions calculate a value across a set of related rows without collapsing them into one row. ROW_NUMBER gives a unique number to each row, RANK and DENSE_RANK handle ties differently, and LAG and LEAD read the previous or next row. A running total uses SUM with an OVER clause ordered by date. If asked when you would use them, say that they are ideal for rankings, comparisons with the previous period, and running totals.

## Subqueries and CTEs

A subquery is a query inside another query. A common table expression, written with the WITH keyword, gives a name to a subquery so that long logic reads from top to bottom. Interviewers like to hear that you use CTEs to make complex queries easier to read and to reuse an intermediate result.

## Handling NULL values

NULL means unknown, not zero or an empty string. You cannot compare it using an equals sign, so you must write IS NULL or IS NOT NULL. COALESCE returns the first value that is not null and is useful for replacing missing values. Remember that aggregate functions such as AVG ignore nulls, which can change your result.

## Normalisation and indexes

Normalisation organises data into separate tables to reduce repetition and keep it consistent. An index works like the index of a book: it helps the database find rows faster, but it uses extra storage and can slow down inserts and updates. A balanced answer shows you understand the trade-off.

## How to practise and answer

Practise writing queries by hand on a small dataset every day for two weeks, and focus on joins, grouping and window functions. In the interview, repeat the question in your own words, state the tables and columns you will use, write the query step by step, and then check it with a small example. If you make a mistake, calmly correct it. Interviewers value a candidate who can debug, so keep practising on the coding and interview sections of Hire Daily and build the habit of explaining your thinking aloud.`,
  },
  {
    slug: "how-to-answer-tell-me-about-yourself",
    title: "How to Answer \"Tell Me About Yourself\" in an Interview (With Examples for Freshers)",
    description: "A simple three-part structure for the most common interview opener, with examples for freshers, mistakes to avoid and a checklist to practise before your next HR round.",
    category: "Interview preparation",
    published: "2026-11-26",
    body: `Almost every interview begins with the same request: tell me about yourself. It sounds easy, yet many freshers either recite their resume or ramble for five minutes. The interviewer is not asking for your life story. They want a short, confident summary that shows who you are, what you can do and why you are right for this role. This guide gives you a simple structure, examples and a practice method so that your answer sounds natural.

## Why interviewers ask this question

This opener helps the interviewer relax you, understand your background quickly and decide where to take the conversation. It also reveals your communication skills, your confidence and how well you understand the job. Whatever you mention here is likely to become a follow-up question, so you are also steering the interview towards your strengths.

## A three-part structure: present, past, future

The easiest way to organise your answer is to move through three short parts.

- Present: who you are right now, such as your degree, year and main skill area.
- Past: one or two experiences that built those skills, such as projects, an internship or training.
- Future: what you want to do next and why this role and company fit that goal.

Aim for sixty to ninety seconds. That is about one hundred and fifty to two hundred words spoken at a natural pace.

## Example for a data analyst fresher

Here is a sample you can adapt with your own details: I recently completed my degree in statistics, and I enjoy turning raw data into clear insights. During my final year I built a sales dashboard in Power BI using twelve months of retail data and found that one product category was behind most of the slow months. I also completed a SQL course and practise queries regularly. I am now looking for an entry-level data analyst role where I can apply these skills on real business problems, and your focus on data-driven decisions is exactly what attracted me to this position.

Notice what makes this work. It is specific, it names real tools and results, and it ends by connecting to the company.

## Example for a software developer fresher

I am a computer science graduate who enjoys building small web applications. In my final year I created a job tracker using React and a simple backend, and I deployed it so that friends could use it. That project taught me how to break a problem into smaller parts, debug errors and work with Git. I have also solved around a hundred coding problems to strengthen my fundamentals. I would like to start my career as a developer in a team where I can learn from experienced engineers and contribute to real products.

## Example for a career changer or someone with a gap

If you have a gap or a different background, be honest and brief. Explain what you did during that time, such as learning a skill or preparing for a new field, and move quickly to what you can offer now. Confidence and clarity matter more than the gap itself.

## What to include and what to leave out

Include your education in one line, your two or three strongest skills, one project or achievement with a result, and your goal. Leave out personal details such as marital status, long family history, salary expectations and negative comments about your college or previous employer. Avoid reading your resume line by line, because the interviewer already has it in front of them.

## Tailor your answer to the role

Read the job description before the interview and choose the parts of your story that match it. A fresher applying for a testing role should mention attention to detail and any testing project, while someone applying for a support role should highlight communication and problem solving. Changing just two or three sentences makes the answer feel written for that company.

## Common mistakes to avoid

- Starting with your childhood or school days.
- Using empty phrases like hard-working and passionate without any proof.
- Speaking for too long or too quickly because of nerves.
- Memorising a script so tightly that it sounds robotic.
- Ending without saying why you want this job.

## How to practise

Write your answer in bullet points rather than full sentences, so you remember the structure without sounding scripted. Say it aloud five or six times, record yourself on your phone, and listen for filler words and pace. Ask a friend to interrupt you with a follow-up question about each point, so you are ready when the interviewer digs deeper. Practise once more on the morning of the interview.

## A quick checklist

Check that your answer fits within ninety seconds, includes one specific project or result, names two or three relevant skills, and ends with your goal for this role. If it does, you have a strong opening. To prepare for the questions that follow, try the HR questions section on Hire Daily, and keep refining your story after every interview you attend.`,
  },
  {
    slug: "how-to-spot-fake-job-offers-and-scams",
    title: "How to Spot Fake Job Offers and Scams: A Safety Guide for Job Seekers",
    description: "Learn the warning signs of fake job offers, how to verify a company and a recruiter, what to do if you already shared documents, and safe habits for every application.",
    category: "Job search guide",
    published: "2027-01-05",
    body: `Fake job offers have become a serious problem for students and freshers who are eager to start their careers. Scammers copy the names of real companies, send professional-looking messages and then ask for money or personal information. The good news is that most scams follow the same patterns, and once you know them you can protect yourself easily. This guide explains the warning signs, how to check whether an offer is real, and what to do if something goes wrong.

## Why freshers are targeted

Scammers know that new graduates are excited, may not have much experience with hiring, and often feel pressure to say yes quickly. They use that urgency to push people into paying fees or sharing sensitive documents. Being aware of this pressure is your first defence. A real employer will never mind if you take a day to verify an offer.

## The biggest red flag: asking for money

A genuine employer does not charge you for an interview, a job, training, a laptop, a uniform, a security deposit or an offer letter. If anyone asks for a registration fee, even a small one, treat it as a scam. Some messages say the amount will be refunded later. Do not believe this. Real companies pay for their own hiring.

## Other warning signs

- The pay is very high for a job with little work or no experience required.
- The message arrives out of the blue from an unknown number or a private chat account, and asks you to move to another app immediately.
- You are offered a job without any interview, or after a very short chat.
- The email comes from a free address such as a general mail account instead of the company domain.
- The message contains many spelling and grammar mistakes, or uses an urgent tone like accept in the next hour.
- You are asked to deposit a cheque, buy gift cards or transfer money for equipment and be reimbursed.
- The recruiter refuses to speak on a call or video, or cannot answer basic questions about the role.

## How to verify a company

Search for the company name on its official website and look at the careers page. Check whether the job is listed there. Look at the company on professional networking sites and see if it has a real page with employees. Compare the domain in the email with the domain of the official website, because scammers often use look-alike addresses with a small change in spelling. If you are unsure, contact the company through the phone number or email listed on its official website, not the one in the suspicious message.

## How to verify the recruiter

Check whether the person has a real, established profile with a work history that matches the company. Be careful with new accounts that have few connections. Ask for the recruiter's official email and confirm it through the company website. A real recruiter will not be offended by these questions.

## Protect your personal information

Share your resume freely, but be careful with documents such as identity cards, bank details and photographs. A real company asks for identity and bank documents only after you have accepted an offer, and usually through an official onboarding system. Never share one-time passwords, card numbers, net banking passwords or UPI PINs with anyone for any hiring process. No employer needs them.

## Check the offer letter

A genuine offer letter normally includes the company name and address, your designation, salary structure, joining date, reporting manager and terms of employment, and it is issued from an official email. Poor formatting, missing company details or a demand to pay before joining are warning signs. If you are unsure, ask a trusted senior or a placement officer to read it.

## Remote jobs and online tasks

Be extra careful with offers for simple online tasks, such as liking videos or rating products, that promise daily payments. These often start with a small payout to build trust and then ask you to deposit money to unlock larger earnings. Legitimate remote jobs still involve interviews and a clear employment agreement.

## What to do if you shared money or documents

Act quickly and calmly. Stop all contact with the scammer and keep screenshots of messages, emails and payment receipts. If you paid money, contact your bank or payment app immediately to report the transaction. In India you can report cyber fraud on the national cyber crime reporting portal or by calling the cyber crime helpline, and you can also file a complaint at your local police station. If you shared identity documents, watch your accounts for unusual activity and consider informing the relevant institutions.

## Safe habits for every application

Apply through official company career pages or trusted listing websites that show the source of each job. Keep a simple record of where you applied. Take your time before replying to any message. Hire Daily shows the source and application link of each listing and notes when a listing is not independently verified, but you should always double-check the details on the employer's own website before sharing personal information.

## Final thoughts

Scammers rely on speed and secrecy. Slowing down, asking questions and verifying through official channels will protect you in almost every case. Share this guide with friends who are starting their job search.`,
  },
  {
    slug: "flutter-developer-fresher-interview-questions",
    title: "Flutter Developer Fresher Interview Questions and Answers",
    description: "The Dart, widget, state management, async and project questions asked in Flutter fresher interviews, with short answers, a code example and a practice plan.",
    category: "Interview preparation",
    published: "2026-11-09",
    body: `Flutter has become a popular way to build mobile apps for Android and iOS from one codebase, and many companies and agencies now hire Flutter developers at entry level. A fresher interview for this role usually mixes Dart language questions, widget and layout questions, state management, working with APIs, and a detailed discussion of the apps you built. This guide walks through the questions that come up most often and shows how to answer each one clearly.

## What interviewers want to see

For a fresher, nobody expects you to know every package. Interviewers check three things: whether you understand how Flutter actually works instead of copying tutorials, whether you can reason about state and data flow, and whether you can explain your own project decisions. If you can say why you picked a widget or an approach, you already stand out.

## Dart basics

Expect a few questions on the language itself. Know the difference between final and const: a final variable is assigned once at runtime, while a const value is fixed at compile time. Explain null safety, which means a variable cannot hold null unless its type allows it with a question mark, and be able to describe the late keyword for variables that are initialised after declaration. Know the difference between var, dynamic and Object, and explain async and await as a way to write asynchronous code that reads like normal code.

## StatelessWidget and StatefulWidget

This is the most common Flutter question. A StatelessWidget describes a part of the UI that does not change after it is built, such as a label or an icon. A StatefulWidget has a State object that can change over time, and calling setState tells Flutter to rebuild the widget with the new values. A short example helps:

~~~
class CounterPage extends StatefulWidget {
  const CounterPage({super.key});
  @override
  State<CounterPage> createState() => _CounterPageState();
}
class _CounterPageState extends State<CounterPage> {
  int _count = 0;
  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => setState(() => _count++),
      child: Text('Count: $_count'),
    );
  }
}
~~~

Add that setState should wrap only the change you need, and that heavy work should not run inside the build method because build can be called many times.

## The widget lifecycle

Be ready to explain the order of the main State methods. initState runs once when the State object is created and is the right place to set up controllers or start a request. didChangeDependencies runs when an inherited dependency changes. build describes the UI. dispose runs when the widget is removed and is where you release controllers, streams and listeners. Forgetting dispose is a common cause of memory leaks, and mentioning it shows care.

## Layout questions

Interviewers like practical layout questions. Explain Row and Column and their main and cross axes, the difference between Expanded and Flexible (Expanded forces a child to fill the space, Flexible lets it be smaller), and when to use Stack for overlapping widgets. Know why ListView.builder is better than a plain ListView for long lists: it builds only the items that are on screen. Mention MediaQuery and LayoutBuilder as ways to adapt a layout to different screen sizes, which matters on real devices.

## BuildContext and keys

BuildContext is a handle to a widget's location in the widget tree, and it is used to find inherited data such as the theme or a Navigator. Keys help Flutter decide which widgets to keep when a list changes, for example when you reorder items that hold their own state. You do not need deep detail, but a clear one-line explanation of each is enough for a fresher.

## State management

You will almost certainly be asked how you manage state beyond setState. Explain that setState is fine for local state in one widget, but larger apps need a shared approach. Popular choices include Provider, Riverpod and Bloc. Say honestly which one you have used, describe how data flows in it, and avoid claiming experience with all of them. A good answer is: I used Provider in my expense tracker to keep the list of expenses in one place and rebuild only the screens that depend on it.

## Async code, APIs and JSON

Know the difference between a Future, which delivers one value later, and a Stream, which delivers many values over time. Explain FutureBuilder and StreamBuilder as widgets that rebuild when the data arrives. For networking, describe how you call an API with the http or dio package, decode the JSON, convert it into model classes, and handle loading and error states so the screen never looks frozen. Interviewers also ask what you do when the network fails, so mention showing a message and a retry option.

## Local storage and Firebase

Be ready to compare options. shared_preferences suits small key-value settings, a local database such as SQLite or Hive suits structured data, and Firebase suits data that must sync across devices. If you used Firebase Authentication or Cloud Firestore, explain what you stored and how you secured it with rules.

## Performance and good habits

Mention using const constructors where possible so widgets are not rebuilt unnecessarily, using ListView.builder for long lists, splitting large build methods into smaller widgets, avoiding unnecessary setState calls, and disposing of controllers. If you have used Flutter DevTools to inspect the widget tree or check performance, say so.

## Hot reload and hot restart

Hot reload injects updated code into the running app and keeps its state, which makes UI changes fast. Hot restart rebuilds the app from the start and resets the state. A full restart is needed after some changes, such as native code or certain initialisation logic.

## Questions about your projects

This is where freshers win or lose. Pick your best app and be ready to explain what problem it solves, the screens, the state management approach, how data is stored, one bug that took you a long time to fix and what you learned, and what you would improve. Have it installed on a phone or ready to demonstrate on an emulator.

## Common mistakes to avoid

- Memorising answers without having built anything.
- Listing many packages you have never used.
- Putting API calls and business logic directly inside widgets.
- Forgetting loading and error states in your demo.
- Saying you know a topic and then being unable to explain it simply.

## A practice plan

Spend the first days revising Dart basics and writing small snippets. Then rebuild a counter, a to-do list and a simple API list screen from memory. Revise state management using the approach in your own project, write one-line answers for each question above in your own words, and finish with a mock interview where a friend asks follow-up questions about your app. Use the interview and study sections on Hire Daily to keep your practice steady.`,
  },
  {
    slug: "flutter-roadmap-for-beginners",
    title: "Flutter Roadmap for Beginners: From Dart Basics to Your First Published App",
    description: "A step-by-step Flutter learning roadmap for beginners and freshers: what to learn in order, five portfolio projects, realistic timelines and how to present it on your resume.",
    category: "Career roadmap",
    published: "2026-12-16",
    body: `Flutter lets you build mobile apps for Android and iOS, and also web and desktop apps, from a single codebase written in Dart. That makes it a practical choice for freshers who want to build real apps without learning two separate platforms from scratch. The difficulty is knowing what to learn first. This roadmap lays out a sensible order, with realistic timelines, projects that prove your skills and the mistakes to avoid.

## Before you start: what you need

You need a computer that can run the Flutter tools, an editor such as VS Code or Android Studio, and ideally an Android phone for testing, although an emulator also works. Installing Flutter is simple, and the flutter doctor command checks your setup and tells you what is missing. If you want to build for iPhones you will also need a Mac, so many beginners start with Android and add iOS later. Set aside one to two hours a day and expect around four to six months to become job-ready. Your own pace will differ, and that is fine.

## Step 1: Learn programming basics and Dart

Spend the first two to three weeks on Dart itself. Learn variables, data types, conditions, loops and functions, then classes, objects, inheritance and collections such as lists, sets and maps. Understand null safety, final and const, and asynchronous code with Future, async and await. Do not skip this step. Beginners who jump straight into widgets often get stuck because they do not understand the language underneath.

## Step 2: Understand widgets and layouts

Everything in Flutter is a widget. Spend about three weeks learning the basic building blocks: Text, Image, Container, Row, Column, Stack, ListView and GridView. Understand the difference between StatelessWidget and StatefulWidget and how setState works. Practise by rebuilding screens from apps you use every day, such as a login page, a profile page and a product list. This teaches layout far faster than reading.

## Step 3: Navigation, forms and theming

Next, learn how to move between screens with the Navigator and a routing package such as go_router, how to pass data between screens, and how to build forms with validation. Learn to set a theme with colours and text styles so the whole app looks consistent. Make the app work well on different screen sizes using MediaQuery and LayoutBuilder.

## Step 4: State management

This is the step that separates beginner apps from real ones. Start by understanding why setState is not enough once many screens share data. Then learn one approach well, such as Provider, Riverpod or Bloc. It is better to know one properly than to know the names of five. Apply it in a project where several screens use the same data, such as a shopping cart.

## Step 5: Networking and JSON

Most apps talk to a server. Learn to call a REST API with the http or dio package, decode JSON, turn it into model classes and show it on screen. Always handle loading, success and error states, and show a retry option when the network fails. Practise with free public APIs for weather, movies or quotes.

## Step 6: Local storage and Firebase

Learn how to keep data on the device with shared_preferences for small settings and a local database such as SQLite or Hive for structured data. Then explore Firebase for sign-in and a cloud database, so your app can keep data across devices. Learn the basics of security rules and never put secret keys directly in the app code.

## Step 7: Testing, debugging and Git

Learn to read error messages, use the debugger and use Flutter DevTools to inspect the widget tree and check performance. Write a few simple widget tests to understand the idea. Use Git from the beginning and push every project to GitHub with a clear README, because recruiters will look at your repositories.

## Step 8: Build and publish

Finish by building a release version of your app. For Android this means building an app bundle and uploading it to the Google Play Console, which requires a developer account and a registration fee. Publishing even a small app teaches you about app icons, versions, permissions, privacy policies and store listings. If publishing is not possible, share a signed APK or a demo video along with your code.

## Five portfolio projects, in order

- A to-do app with local storage. It proves you understand widgets, forms and saving data.
- A weather or movie app using a public API. It proves you can handle networking, JSON and loading and error states.
- An expense tracker with a chart. It proves you can manage state and present data clearly.
- A shopping app interface with a cart. It proves you can share state across several screens and design a good layout.
- A chat or notes app with Firebase sign-in. It proves you can build a complete product with authentication and a cloud database.

For each project write a short README with screenshots, the features, the packages you used and what you learned. Quality matters more than quantity.

## How to show Flutter on your resume

List Flutter and Dart in your skills, then describe each project with the tools used and the outcome. For example: Built an expense tracker in Flutter with Provider for state management and SQLite for local storage, with charts showing monthly spending. Include links to GitHub and, if possible, the store listing or a demo video. Avoid listing packages you have not used.

## Common mistakes to avoid

- Watching endless tutorials without building anything alone.
- Copying a complete tutorial project and calling it your own without understanding it.
- Putting all the code in one huge file instead of splitting widgets and logic.
- Ignoring state management until the app becomes a mess.
- Never testing on a real device or on different screen sizes.

## Keep improving after your first job search begins

While you apply, keep adding one small feature to a project every week, read the official Flutter documentation and practise explaining your app aloud. Prepare with the Flutter interview questions guide and the coding practice on Hire Daily, and check job listings that mention Flutter or mobile app development. Steady progress for a few months is enough to build a portfolio that gets interviews.`,
  },
];

const DAY_MS = 86_400_000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** True when the article's go-live date has arrived. */
export const isLive = (a: Article, now = Date.now()) => Date.parse(a.published) <= Math.max(now, startOfToday() + DAY_MS - 1);

/** Articles that are live right now, newest first. */
export const liveArticles = () => ARTICLES.filter((a) => isLive(a)).sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

/** Reading time from the real word count (about 200 words a minute). */
export const readMinutes = (a: Article) => Math.max(1, Math.round(a.body.split(/\s+/).length / 200));

/** Returns the article only if it is live. */
export const getArticle = (slug: string) => {
  const a = ARTICLES.find((x) => x.slug === slug);
  return a && isLive(a) ? a : undefined;
};
