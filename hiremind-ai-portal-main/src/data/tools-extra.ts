/**
 * Four collections for the Tools and Resources page: copy-ready templates, guides and official links.
 * General guidance only. Nothing here is insider information about any employer.
 */
export type ToolLink = { name: string; desc: string; url: string; tag: "Free" | "Freemium" };
export type CopyItem = { title: string; text: string; note?: string };
export type Step = { t: string; d: string };
export type ExtraTab = { title: string; tip: string; steps?: Step[]; copies?: CopyItem[]; tools?: ToolLink[] };
export type ExtraCollection = {
  id: "resume" | "salary" | "ai" | "kits"; title: string; desc: string; grad: string; chip: string; tabs: ExtraTab[];
};

const link = (name: string, tag: ToolLink["tag"], url: string, desc: string): ToolLink => ({ name, tag, url, desc });
const s = (t: string, d: string): Step => ({ t, d });

export const EXTRA_COLLECTIONS: ExtraCollection[] = [
  {
    id: "resume", title: "Resume and Cover Letter Templates", grad: "from-pink-500 to-rose-600",
    chip: "bg-pink-50 text-pink-700 dark:bg-pink-400/10 dark:text-pink-300",
    desc: "ATS-friendly templates for freshers and experienced candidates. Copy, fill in the brackets and make it yours.",
    tabs: [
      { title: "Resume templates", tip: "Replace every [bracket] with your own facts. Delete any line you cannot honestly support in an interview.", copies: [
        { title: "Fresher resume (one page)", note: "Single column, plain text headings, easy for ATS software to read.", text: `[YOUR NAME]
[City, State] | +91 [phone] | [email] | linkedin.com/in/[you] | github.com/[you]

SUMMARY
[Degree] graduate with hands-on experience in [skill 1], [skill 2] and [skill 3]. Built [number] projects, including [project type]. Looking for an entry-level [role] position where I can [what you want to contribute].

SKILLS
Technical: [languages, databases, tools]
Tools: [Excel, Power BI, Git, etc.]

PROJECTS
[Project name] | [tools used] | [link]
- [Action verb] [what you built] using [tools], covering [size of data or number of users].
- [Action verb] [problem you solved], which [result you can honestly state].

EDUCATION
[Degree], [College], [Year of passing] | [CGPA or percentage]

INTERNSHIPS AND TRAINING (if any)
[Role], [Company or institute] | [Month Year to Month Year]
- [What you did and what came out of it]

CERTIFICATIONS (only relevant ones)
[Name], [Provider], [Year]` },
        { title: "Project bullet formula", note: "Action verb + what you built + tools + result.", text: `Formula:
[Action verb] + [what you built] + using [tools] + [result or scale]

Examples to copy the style from (replace with your own work):
- Built a Power BI sales dashboard from 12 months of retail data, making the slowest product category visible at a glance.
- Wrote 25 SQL queries with joins and window functions to answer business questions on a customer orders dataset.
- Developed a React job tracker with login and deployed it so friends could use it, which taught me debugging and Git workflow.` },
        { title: "Experienced professional resume", note: "Put experience before education and lead each bullet with the result.", text: `[YOUR NAME] | [City] | +91 [phone] | [email] | [LinkedIn]

PROFILE
[Role] with [X] years of experience in [domain]. Strong in [skill 1], [skill 2] and [skill 3]. Known for [one real strength].

EXPERIENCE
[Job title], [Company] | [Month Year to Present]
- [Result achieved] by [what you did], using [tools].
- [Responsibility you owned], supporting [team, customers or revenue].
- [Improvement you made], reducing [time, cost or errors] by [real figure].

[Previous job title], [Company] | [Month Year to Month Year]
- [Achievement 1]
- [Achievement 2]

SKILLS
[Grouped list of tools and skills]

EDUCATION
[Degree], [College], [Year]` },
      ] },
      { title: "Cover letters", tip: "Keep it under 200 words. One paragraph on why this company, one on what you bring, one closing line.", copies: [
        { title: "Fresher cover letter", text: `Subject: Application for [Role]

Dear [Hiring Manager's name or Hiring Team],

I am a [degree] graduate applying for the [role] position at [Company]. I was drawn to [something specific about the company, its product or its work], and I would like to contribute to it.

During my studies I [one concrete project or experience], using [tools or skills]. This taught me [a real lesson], and I would bring the same approach to [what the job needs].

I have attached my resume and would be glad to discuss how I can help your team. Thank you for your time.

Sincerely,
[Your name]
[Phone] | [Email]` },
        { title: "Short application email", text: `Subject: [Role] application, [Your name]

Hello [Name or Team],

I am applying for the [role] opening (reference: [job ID or link]). I have [one line about your most relevant skill or project]. My resume is attached.

I would be happy to share more details or complete any test you need.

Regards,
[Your name] | [Phone] | [LinkedIn]` },
        { title: "Cover note with a referral", text: `Hello [Name],

[Referrer's name] suggested that I reach out about the [role] position at [Company]. I work with [skills] and recently [one relevant project]. I have attached my resume for your review.

Thank you for considering my application.

[Your name]` },
      ] },
      { title: "LinkedIn and follow-ups", tip: "Send follow-ups once, politely, after a week. Never send the same message twice.", copies: [
        { title: "LinkedIn headline formulas", text: `[Target role] | [Skill 1], [Skill 2], [Skill 3] | [Degree or college]
Aspiring [role] | Built [project type] using [tools]
[Role] | Helping [who] with [what] | [Tool 1], [Tool 2]` },
        { title: "About section starter", text: `I am a [degree] graduate who enjoys [what you like doing]. I have worked on [two projects or experiences] using [tools], and I am looking for [type of role] where I can [contribution].

What I work with: [skill list]
What I am learning now: [one honest item]
Open to: [roles and locations]
Contact: [email]` },
        { title: "Follow-up after applying", text: `Subject: Following up on my [role] application

Hello [Name],

I applied for the [role] position on [date] and wanted to confirm that my application was received. I remain very interested and can share any extra information you need.

Thank you,
[Your name]` },
        { title: "Thank-you after an interview", text: `Subject: Thank you, [Role] interview

Hello [Name],

Thank you for taking the time to speak with me today about the [role]. I enjoyed learning about [something specific from the conversation], and it made me more excited about the opportunity.

Please let me know if I can provide anything else.

Regards,
[Your name]` },
        { title: "Referral request message", text: `Hi [Name], I hope you are doing well. I noticed [Company] is hiring for [role], and my background in [skill or project] seems a good match. If you feel comfortable, could you refer me or point me to the right person? I can send my resume and a short summary. Thank you either way.` },
      ] },
    ],
  },
  {
    id: "salary", title: "Salary and Negotiation Guides", grad: "from-emerald-500 to-green-600",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    desc: "How to research pay, read an offer carefully and negotiate politely, with scripts you can adapt.",
    tabs: [
      { title: "Research pay", tip: "Salary sites show self-reported numbers that may be old. Use them for a range, not for an exact figure.",
        steps: [
          s("Collect 3 to 5 data points", "Look at the same role, city and experience level on more than one source."),
          s("Compare like with like", "A large IT services company, a product company and a startup pay differently for the same title."),
          s("Think in ranges", "Decide your minimum acceptable pay, your target and the point at which you would walk away."),
          s("Look beyond the base pay", "Variable pay, joining bonus, insurance and learning opportunities all have value."),
        ],
        tools: [
          link("Glassdoor", "Free", "https://www.glassdoor.co.in", "Company reviews and employee-reported salaries."),
          link("AmbitionBox", "Free", "https://www.ambitionbox.com", "Indian company reviews and reported salaries by role."),
          link("Naukri", "Freemium", "https://www.naukri.com", "Job listings that often show a salary range."),
          link("Levels.fyi", "Free", "https://www.levels.fyi", "Reported pay for technology roles, mostly at larger companies."),
        ] },
      { title: "Understand your offer", tip: "Ask for the offer in writing and read every line before you reply. It is fine to ask questions.", steps: [
        s("CTC versus take-home", "CTC is the total cost to the company. Your monthly in-hand pay is lower after deductions such as provident fund and tax. Ask for a breakup."),
        s("Fixed versus variable pay", "Fixed pay is guaranteed. Variable pay depends on performance or company results. Ask how much of the CTC is variable and how it is paid out."),
        s("Joining bonus and clawback", "If there is a joining bonus, check whether you must return it if you leave within a set period."),
        s("Notice period and buyout", "Know how long your notice is and whether it can be shortened."),
        s("Bond or service agreement", "Some employers ask you to stay for a minimum time or repay training costs. Read the terms and the amount."),
        s("Probation and confirmation", "Check how long probation lasts and what changes after confirmation."),
        s("Benefits and working terms", "Insurance, leave, work from home, shift timings, location and relocation support."),
      ] },
      { title: "Negotiation scripts", tip: "Be warm, specific and calm. Thank them first, make one clear request and give a reason.", copies: [
        { title: "When asked for your expectation", text: `Based on my research for this role and city, and my skills in [skills], I am looking for a range of [range]. I am open to discussing the full package, including growth and learning opportunities. Could you share the budgeted range for this position?` },
        { title: "Countering an offer", text: `Thank you for the offer. I am excited about the role and the team. Based on my research and the skills I bring, such as [one or two strengths], I was expecting something closer to [figure]. Is there flexibility to move towards that?` },
        { title: "When the pay is fixed", text: `I understand the base pay is fixed. Would it be possible to adjust other parts of the package, such as [joining bonus, review after 6 months, learning budget or flexible working]?` },
        { title: "Asking for time to decide", text: `Thank you for the offer. I would like to review it carefully. Could I have until [date] to respond?` },
        { title: "Declining politely", text: `Thank you very much for the offer and for your time during the process. After careful thought, I have decided to accept another opportunity. I appreciate it and hope we can stay in touch.` },
        { title: "Accepting and confirming", text: `I am happy to accept the offer for [role]. I confirm a joining date of [date] and a package of [details as in the offer letter]. Please let me know the next steps and the documents I need to submit.` },
      ] },
      { title: "Compare offers", tip: "The highest number is not always the best offer. Score each option on the things you care about.", steps: [
        s("Learning and growth", "Will you work with people who can teach you, and on real problems?"),
        s("Role and tech", "Does the work match the skills you want to build over the next two years?"),
        s("Stability and reputation", "Check how long the company has operated and what current employees say."),
        s("Total package", "Compare take-home pay, variable pay, benefits and any bond terms, not just the CTC."),
        s("Location and lifestyle", "Commute, shifts and work from home affect your daily life and costs."),
      ] },
    ],
  },
  {
    id: "ai", title: "AI Tools for Careers", grad: "from-violet-500 to-indigo-600",
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
    desc: "AI assistants, writing helpers and ready prompts for resumes, practice and research, plus how to use them safely.",
    tabs: [
      { title: "AI assistants", tip: "Use an assistant to practise and get ideas. You still need to check facts and write in your own voice.", tools: [
        link("ChatGPT", "Freemium", "https://chatgpt.com", "General assistant for drafting, explaining topics and practising interviews."),
        link("Claude", "Freemium", "https://claude.ai", "Assistant that is good at long documents, writing and step-by-step explanations."),
        link("Gemini", "Freemium", "https://gemini.google.com", "Google's assistant, connected with Google apps and search."),
        link("Perplexity", "Freemium", "https://www.perplexity.ai", "Answer engine that shows sources, useful for company research."),
      ] },
      { title: "Writing and checking", tip: "Run your resume and emails through a checker for spelling and clarity before you send them.", tools: [
        link("Grammarly", "Freemium", "https://www.grammarly.com", "Spelling, grammar and tone suggestions."),
        link("LanguageTool", "Freemium", "https://languagetool.org", "Grammar and style checker that supports many languages."),
        link("Hemingway Editor", "Free", "https://hemingwayapp.com", "Highlights long, hard-to-read sentences."),
      ] },
      { title: "Prompts to copy", tip: "Give the assistant real facts about you. Never paste ID numbers, bank details or passwords.", copies: [
        { title: "Resume review", text: `Act as a recruiter for [role]. Review the resume below and tell me: (1) the three weakest parts, (2) which bullets need a result or number, (3) keywords from this job description that are missing: [paste job description]. Do not invent any experience for me.

Resume:
[paste resume text]` },
        { title: "Mock interview", text: `Be an interviewer for a [role] fresher position at a [type of company]. Ask me one question at a time, wait for my answer, then give feedback on clarity and correctness and ask a follow-up. Start with an easy question. After 8 questions give me a summary of my strengths and weak topics.` },
        { title: "Explain a concept", text: `Explain [topic] to me as if I am a beginner. Use a simple real-life example, then a short code or query example, then give me 3 practice questions with answers hidden until I ask.` },
        { title: "Cover letter from my facts", text: `Write a cover letter under 180 words for the [role] position at [company]. Use only these facts about me: [list 3-4 real facts]. Keep the tone warm and professional and do not add any claims that are not in my list.` },
        { title: "Four-week learning plan", text: `I want to prepare for a [role] interview in 4 weeks. I can study [hours] hours a day and I already know [skills]. Make a week-by-week plan with topics, practice tasks and one mini project.` },
        { title: "Project idea", text: `Suggest 3 portfolio project ideas for a [role] fresher using [tools]. For each one give the goal, the dataset or data source, the steps and what I should show in the README.` },
      ] },
      { title: "Use AI safely", tip: "Treat AI as a tutor, not as the author of your application.", steps: [
        s("Protect your information", "Do not paste identity numbers, bank details, passwords or other people's private data."),
        s("Check every fact", "AI can sound confident and be wrong. Verify names, dates, figures and technical claims."),
        s("Keep it honest", "Do not let AI add skills, projects or experience you do not have. You will be asked about everything."),
        s("Edit in your own words", "Employers can tell when every application sounds the same. Add your own details."),
        s("Follow the rules", "Some assessments and companies do not allow AI help. Read the instructions first."),
      ] },
    ],
  },
  {
    id: "kits", title: "Company-wise Prep Kits", grad: "from-amber-500 to-orange-600",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    desc: "Preparation plans by type of employer, with official career pages. General guidance, not insider information.",
    tabs: [
      { title: "IT services companies", tip: "Mass-hiring processes reward steady basics. Aptitude and communication matter as much as coding.",
        steps: [
          s("Typical process", "Online test (aptitude, reasoning, English and basic coding), then a technical interview, then an HR round. Exact rounds change by company and year, so read the current notice."),
          s("Prepare the test", "Practise quantitative aptitude, logical reasoning, verbal ability and easy to medium coding problems under a timer."),
          s("Prepare the technical round", "Revise your core subjects (programming basics, DBMS, operating systems, networks) and be ready to explain your projects."),
          s("Prepare the HR round", "Introduce yourself clearly, know the company, and be ready to talk about location, shifts and joining flexibility."),
        ],
        tools: [
          link("TCS careers", "Free", "https://www.tcs.com/careers", "Official careers page."),
          link("Infosys careers", "Free", "https://www.infosys.com/careers", "Official careers page."),
          link("Wipro careers", "Free", "https://careers.wipro.com", "Official careers page."),
          link("Cognizant careers", "Free", "https://careers.cognizant.com", "Official careers page."),
          link("Capgemini careers", "Free", "https://www.capgemini.com/in-en/careers", "Official careers page for India."),
          link("Accenture careers", "Free", "https://www.accenture.com/in-en/careers", "Official careers page for India."),
        ] },
      { title: "Product companies", tip: "Depth matters more than breadth. Be able to explain why your solution works and how fast it is.",
        steps: [
          s("Typical process", "Online coding assessment, several technical rounds on problem solving, and a behavioural or values round. Large employers publish their own guides, so read those first."),
          s("Prepare problem solving", "Practise arrays, strings, hash maps, trees, graphs and basic dynamic programming. Always state time and space complexity."),
          s("Prepare design basics", "Be ready to explain how you would design a simple system such as a URL shortener, and talk about trade-offs."),
          s("Prepare behavioural answers", "Use the STAR method (Situation, Task, Action, Result) with two or three real stories."),
        ],
        tools: [
          link("Amazon Jobs", "Free", "https://www.amazon.jobs", "Official careers page, including interview preparation material."),
          link("Microsoft Careers", "Free", "https://careers.microsoft.com", "Official careers page."),
          link("Google Careers", "Free", "https://www.google.com/about/careers/applications", "Official careers page."),
        ] },
      { title: "Startups", tip: "Show that you can learn fast and finish things. A live project is your best resume line.", steps: [
        s("Typical process", "Fewer, faster rounds. A founder or senior engineer often interviews you directly, and a small practical task is common."),
        s("Show real work", "Have two deployed projects and be ready to walk through the code or the decisions behind them."),
        s("Show ownership", "Give examples where you worked without being told every step, or fixed something no one asked you to."),
        s("Ask good questions", "Ask about the product, the team size, how decisions are made and what you would own in the first 90 days."),
      ] },
      { title: "Analytics and consulting", tip: "Think aloud. Interviewers want to follow your reasoning, not only hear the final answer.", steps: [
        s("Typical process", "A skills test (SQL, Excel or aptitude), a case or business question, and a fit interview."),
        s("Prepare skills tests", "Practise SQL joins, grouping and window functions, and Excel pivot tables and lookups under a timer."),
        s("Prepare case questions", "Structure your answer: clarify the goal, break the problem into parts, check the data, then recommend an action."),
        s("Prepare to communicate", "Practise explaining a result in two sentences to someone who does not know the topic."),
      ] },
    ],
  },
];
