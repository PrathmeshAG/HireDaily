export type Kind = "notes" | "cheat" | "roadmap" | "project";
export type Phase = { title: string; time: string; topics: string[]; practice: string; goal: string };
export type Project = { name: string; about: string; tools: string[]; steps: string[]; outcome: string };
export type Block =
  | { t: "p"; text: string } | { t: "h"; text: string } | { t: "code"; text: string }
  | { t: "tip"; text: string } | { t: "list"; items: string[] };
export type Page = { title: string; blocks: Block[] };
export type Content =
  | { kind: "steps"; items: [string, string, string][] }
  | { kind: "table"; head: [string, string]; rows: [string, string][] }
  | { kind: "points"; items: string[] }
  | { kind: "roadmap"; items: Phase[] }
  | { kind: "projects"; items: Project[] }
  | { kind: "pages"; items: Page[] };
export type Section = { title: string; content: Content };
export type Resource = {
  id: string; type: Kind; domain: string; title: string; desc: string;
  level: "Beginner" | "Intermediate" | "Advanced"; time: string;
  content?: Content; sections?: Section[];
};

const pts = (...items: string[]): Content => ({ kind: "points", items });
const road = (...items: Phase[]): Content => ({ kind: "roadmap", items });
const projs = (...items: Project[]): Content => ({ kind: "projects", items });
const ph = (title: string, time: string, topics: string[], practice: string, goal: string): Phase => ({ title, time, topics, practice, goal });

// Replace existing cards (same id) with detailed, multi-section versions.
export const DETAILED: Record<string, Partial<Resource>> = {
  "rm-analyst": {
    time: "4-5 months", desc: "Six phases from Excel and SQL to dashboards, projects and interviews, with weekly practice.",
    sections: [
      { title: "Roadmap", content: road(
        ph("Excel and statistics", "3 weeks", ["XLOOKUP, IF, SUMIFS, COUNTIFS", "Pivot tables and charts", "Data cleaning: duplicates, text functions, validation", "Mean, median, variance, standard deviation", "Probability and normal distribution"], "Clean a messy sales sheet and build a pivot summary with 3 charts.", "Answer business questions from a spreadsheet confidently."),
        ph("SQL", "4 weeks", ["SELECT, WHERE, ORDER BY, LIMIT", "Joins, GROUP BY and HAVING", "Subqueries and CTEs", "Window functions: RANK, LAG, running totals", "Indexes and query optimisation basics"], "Solve 50 SQL problems on HackerRank or LeetCode and one case study.", "Write interview-level SQL without help."),
        ph("Python for analysis", "4 weeks", ["Python basics, loops and functions", "NumPy and pandas", "Merge, groupby and pivot", "Matplotlib and Seaborn charts", "Jupyter notebooks"], "Run a complete exploratory analysis on a Kaggle dataset.", "Clean, analyse and visualise data with code."),
        ph("Power BI or Tableau", "3 weeks", ["Data model and relationships", "Power Query for cleaning", "DAX: CALCULATE, SUMX, time intelligence", "Dashboard design and storytelling", "Publishing and sharing reports"], "Build a two-page sales dashboard with slicers and KPIs.", "Create dashboards a manager can use without explanation."),
        ph("Portfolio and case thinking", "4 weeks", ["3 end-to-end projects", "GitHub README with insights", "Metrics, funnels and A/B tests", "Resume and LinkedIn profile"], "Publish three projects and write one insight post.", "A portfolio that proves your skills."),
        ph("Interview preparation", "2 weeks", ["SQL and Excel timed tests", "Statistics questions", "Case study walkthroughs", "HR and behavioural answers"], "Do two mock interviews and review every answer.", "Walk into interviews prepared."),
      ) },
      { title: "Skills checklist", content: pts("Excel: pivot tables, XLOOKUP, charts", "SQL: joins, CTEs, window functions", "Python: pandas, visualisation", "Power BI or Tableau dashboard", "Statistics and A/B testing basics", "Clear communication of insights") },
    ],
  },
  "rm-software": {
    time: "6-8 months", desc: "Five phases covering a language, DSA, tools, databases, frameworks and system design.",
    sections: [
      { title: "Roadmap", content: road(
        ph("Language and problem solving", "5 weeks", ["Variables, conditions, loops, functions", "Strings, lists and dictionaries", "Error handling and file handling", "Reading and writing clean code"], "Solve 40 beginner problems and build a command-line app.", "Think in code comfortably."),
        ph("Data structures and algorithms", "8 weeks", ["Arrays, strings, hash maps", "Stacks, queues, linked lists", "Trees, graphs, heaps", "Sorting, searching, recursion, DP basics", "Big O analysis"], "Solve 150 problems across topics, 3 per week on a timer.", "Crack standard coding rounds."),
        ph("OOP, Git and tools", "3 weeks", ["Four pillars and SOLID basics", "Branching, merging, pull requests", "Debugging and unit testing", "Terminal and IDE skills"], "Contribute to a small open source repo or team project.", "Work like a professional developer."),
        ph("Databases and backend or frontend", "8 weeks", ["SQL, normalisation and indexes", "REST APIs, authentication, JWT", "Node, Spring or Django, or React with state management", "One NoSQL database such as MongoDB"], "Build a full CRUD app with login and deploy it.", "Ship working applications."),
        ph("System design and projects", "4 weeks", ["Caching, load balancing, queues", "Scaling databases", "Docker and CI/CD basics", "Two portfolio projects"], "Design a URL shortener and chat app on paper, then build one.", "Handle design interviews and show proof of work."),
      ) },
      { title: "Skills checklist", content: pts("One language mastered", "150+ DSA problems", "Git workflow", "SQL and one backend framework", "Two deployed projects", "Basic system design") },
    ],
  },
  "rm-cyber": {
    time: "6-8 months", desc: "Five phases: networking, fundamentals, web security, tools and labs, then certification.",
    sections: [
      { title: "Roadmap", content: road(
        ph("Networking and Linux", "5 weeks", ["TCP/IP, DNS, HTTP, ports", "Subnets and routing basics", "Linux commands, permissions, processes", "Bash scripting basics"], "Set up a Linux VM and map a small home network.", "Understand how data moves and how to use Linux."),
        ph("Security fundamentals", "3 weeks", ["CIA triad, risk and threats", "Encryption, hashing, PKI and TLS", "Authentication and access control", "Malware types and social engineering"], "Write a one-page explanation of how HTTPS works.", "Speak the language of security."),
        ph("Web application security", "4 weeks", ["OWASP Top 10", "SQL injection, XSS, CSRF", "Broken access control and SSRF", "Secure coding basics"], "Exploit and fix each bug in DVWA or Juice Shop.", "Find and explain web vulnerabilities."),
        ph("Tools and blue-team skills", "5 weeks", ["Nmap, Wireshark, Burp Suite", "SIEM concepts and log analysis", "Intrusion detection and incident response steps", "Threat modelling"], "Analyse a packet capture and write detection rules.", "Use industry tools with confidence."),
        ph("Labs and certification", "8 weeks", ["TryHackMe and Hack The Box paths", "Beginner CTFs", "Security+ preparation", "Resume with lab write-ups"], "Complete 30 rooms and publish 3 write-ups.", "Job-ready proof and a recognised certificate."),
      ) },
      { title: "Skills checklist", content: pts("Networking and Linux confidence", "OWASP Top 10 exploits and fixes", "Nmap, Wireshark, Burp Suite", "Log analysis basics", "Security+ level knowledge", "Public lab write-ups") },
    ],
  },
  "nt-oop": {
    title: "Software Development Notes", time: "25 min read", desc: "OOP, data structures and databases in clear, interview-ready sections.",
    sections: [
      { title: "OOP", content: pts("A class is a blueprint; an object is an instance of it.", "Encapsulation: keep data private and expose it through methods.", "Abstraction: show what an object does and hide how.", "Inheritance reuses a parent class; polymorphism lets one call behave differently per type.", "Prefer composition over inheritance when there is no clear is-a relation.") },
      { title: "Data structures", content: pts("Array: O(1) index access, costly middle inserts.", "Linked list: cheap inserts and deletes, O(n) search.", "Hash map: average O(1) lookup using a hash function.", "Stack is LIFO, queue is FIFO; both are used in parsing and scheduling.", "Trees and graphs model hierarchies and networks; learn BFS and DFS.") },
      { title: "Databases", content: pts("Primary key identifies a row; foreign key links tables.", "Normalisation removes redundancy; indexes speed up reads.", "ACID: Atomicity, Consistency, Isolation, Durability.", "SQL suits structured data and joins; NoSQL suits flexible, large-scale data.", "Use transactions when several updates must succeed together.") },
    ],
  },
  "nt-network": {
    title: "Cyber Security Notes", time: "25 min read", desc: "Networking, web security and cryptography explained simply.",
    sections: [
      { title: "Networking", content: pts("OSI has 7 layers: Physical, Data link, Network, Transport, Session, Presentation, Application.", "TCP is reliable and ordered; UDP is faster but unreliable.", "IP identifies a device; a port identifies a service (HTTP 80, HTTPS 443, SSH 22).", "DNS converts domain names into IP addresses.", "A firewall filters traffic by rules; a VPN encrypts traffic over untrusted networks.") },
      { title: "Web security", content: pts("SQL injection: run attacker SQL through unsanitised input. Fix with prepared statements.", "XSS: scripts injected into pages. Fix with output encoding and CSP.", "CSRF: forged requests from a logged-in browser. Fix with tokens and SameSite cookies.", "Broken access control is the top OWASP risk: always check permissions on the server.", "Use HTTPS, secure cookies and strong password hashing.") },
      { title: "Cryptography", content: pts("Symmetric encryption uses one key (AES); asymmetric uses a key pair (RSA).", "Hashing is one-way and used for integrity and password storage; add a salt.", "Digital signatures prove who sent data and that it was not changed.", "TLS combines asymmetric key exchange with symmetric bulk encryption.") },
    ],
  },
  "pj-analyst": {
    title: "Data Analyst Projects", time: "6 projects", desc: "Basic, intermediate and advanced projects with tools and build steps.",
    sections: [
      { title: "Basic", content: projs(
        { name: "Sales Performance Dashboard", about: "Summarise monthly sales by product and region.", tools: ["Excel", "Pivot tables", "Charts"], steps: ["Download a sample sales dataset", "Clean duplicates and fix date formats", "Build pivot tables for revenue, profit and region", "Add slicers and a one-page dashboard"], outcome: "Shows Excel, cleaning and basic reporting." },
        { name: "Student Marks Analysis", about: "Find top performers and weak subjects.", tools: ["SQL", "MySQL or PostgreSQL"], steps: ["Create tables and load CSV data", "Use GROUP BY for averages per subject", "Rank students with window functions", "Write 5 insights"], outcome: "Shows SQL fundamentals with clear insights." },
      ) },
      { title: "Intermediate", content: projs(
        { name: "Customer Churn Analysis", about: "Find why customers leave and who is at risk.", tools: ["Python", "pandas", "Seaborn", "SQL"], steps: ["Load a telecom churn dataset", "Clean data and handle missing values", "Compare churn by contract, tenure and charges", "Visualise drivers and suggest retention actions"], outcome: "Shows EDA and business thinking." },
        { name: "E-commerce Funnel Dashboard", about: "Track view, cart, checkout and purchase drop-off.", tools: ["Power BI", "DAX", "Power Query"], steps: ["Import event data and build a data model", "Create DAX measures for conversion rates", "Design funnel and trend visuals", "Add filters by channel and device"], outcome: "Shows BI modelling and dashboard design." },
      ) },
      { title: "Advanced", content: projs(
        { name: "Sales Forecasting", about: "Predict the next quarter of sales with seasonality.", tools: ["Python", "statsmodels or Prophet", "Matplotlib"], steps: ["Prepare a time-series dataset", "Check trend and seasonality", "Train and compare two models", "Report error metrics (MAPE) and a forecast chart"], outcome: "Shows statistics, modelling and evaluation." },
        { name: "End-to-End Analytics Pipeline", about: "Automate data from source to dashboard.", tools: ["Python", "SQL", "PostgreSQL", "Power BI", "GitHub"], steps: ["Extract data from an API or CSV with Python", "Clean and load it into PostgreSQL", "Schedule the script", "Connect Power BI and document the flow in the README"], outcome: "Shows ETL skills and production thinking." },
      ) },
    ],
  },
};

export const EXTRA_LIVE: Resource[] = [
  {
    id: "nt-analyst", type: "notes", domain: "Data Analyst", title: "Data Analyst Notes", level: "Beginner", time: "30 min read",
    desc: "Excel, SQL, Python, Power BI and statistics in separate sections.",
    sections: [
      { title: "Excel", content: pts("XLOOKUP finds a value by key; use it instead of VLOOKUP when possible.", "SUMIFS and COUNTIFS aggregate with conditions.", "Pivot tables summarise data by rows, columns and values in seconds.", "Use Remove Duplicates, TRIM and Text to Columns for cleaning.", "Conditional formatting and charts make patterns visible.") },
      { title: "SQL", content: pts("Order of execution: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY.", "INNER JOIN keeps matches; LEFT JOIN keeps all rows from the left table.", "Use CTEs (WITH) to make long queries readable.", "Window functions (RANK, LAG, SUM OVER) calculate across rows without collapsing them.", "Use COALESCE to handle NULL values.") },
      { title: "Python", content: pts("pandas DataFrame is the core table structure.", "Use df.info(), df.describe() and df.isna().sum() first.", "groupby plus agg gives summary tables; merge works like SQL joins.", "Visualise with Matplotlib or Seaborn: histograms, box plots, bar charts.", "Keep work in Jupyter notebooks with short explanations.") },
      { title: "Power BI", content: pts("Power Query cleans and shapes data before loading.", "Model data as a star schema: one fact table and several dimension tables.", "DAX measures (SUM, CALCULATE, DIVIDE) compute values based on filters.", "Use time intelligence functions such as SAMEPERIODLASTYEAR for growth.", "Good dashboards have a clear title, 3-5 KPIs, and consistent colours.") },
      { title: "Statistics", content: pts("Mean is affected by outliers; median is more robust.", "Standard deviation measures spread around the mean.", "Correlation shows association, not causation.", "A p-value below 0.05 usually means the result is unlikely to be chance.", "A/B tests compare two versions using randomly assigned groups.") },
    ],
  },
  {
    id: "pj-software", type: "project", domain: "Software Development", title: "Software Developer Projects", level: "Intermediate", time: "3 projects",
    desc: "Basic, intermediate and advanced projects for a developer portfolio.",
    sections: [
      { title: "Basic", content: projs({ name: "Task Manager App", about: "Add, edit, complete and delete tasks.", tools: ["JavaScript or Python", "HTML/CSS", "Local storage or SQLite"], steps: ["Design the screens and data model", "Build create, read, update and delete", "Add filters and due dates", "Host it and write a README"], outcome: "Shows CRUD and clean code basics." }) },
      { title: "Intermediate", content: projs({ name: "Blog REST API with Login", about: "A backend with users, posts and comments.", tools: ["Node/Express or Django", "PostgreSQL", "JWT", "Postman"], steps: ["Design tables and relations", "Create authenticated endpoints", "Add validation and error handling", "Write tests and deploy"], outcome: "Shows backend, auth and database skills." }) },
      { title: "Advanced", content: projs({ name: "URL Shortener at Scale", about: "Shorten links with analytics and fast redirects.", tools: ["Backend framework", "Redis", "PostgreSQL", "Docker"], steps: ["Generate unique short keys with base62", "Cache hot links in Redis", "Add click analytics through a queue", "Containerise with Docker and add CI"], outcome: "Shows system design thinking." }) },
    ],
  },
  {
    id: "pj-cyber", type: "project", domain: "Cyber Security", title: "Cyber Security Projects", level: "Intermediate", time: "3 projects",
    desc: "Basic, intermediate and advanced lab projects with write-ups.",
    sections: [
      { title: "Basic", content: projs({ name: "Network Scan Report", about: "Scan your own lab network and report findings.", tools: ["Nmap", "Wireshark", "VirtualBox"], steps: ["Create two VMs on a private network", "Run host and service scans", "Capture traffic and identify protocols", "Write a report with risks and fixes"], outcome: "Shows networking and reporting basics." }) },
      { title: "Intermediate", content: projs({ name: "Web App Penetration Test", about: "Test a deliberately vulnerable app and document it.", tools: ["DVWA or Juice Shop", "Burp Suite", "OWASP Top 10"], steps: ["Set up the app locally", "Find SQL injection, XSS and access control bugs", "Capture evidence with screenshots", "Write a report with severity and remediation"], outcome: "Shows web security skills." }) },
      { title: "Advanced", content: projs({ name: "SIEM Home Lab", about: "Collect logs and detect attacks in a mini SOC.", tools: ["Splunk or Wazuh", "Windows and Linux VMs", "Sysmon"], steps: ["Install a SIEM and forward logs from two VMs", "Simulate brute force and port scans", "Write detection rules and alerts", "Document a sample incident timeline"], outcome: "Shows blue-team and detection skills." }) },
    ],
  },
];