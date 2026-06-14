'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

// 1. All 57 target career roles mapped to Beginner, Intermediate, and Advanced skills
const ROLE_SKILLS: Record<string, { beginner: string[], intermediate: string[], advanced: string[] }> = {
  // Technology
  'Software Engineer': {
    beginner: ['HTML', 'CSS', 'JavaScript', 'Git'],
    intermediate: ['Python', 'Java', 'SQL', 'Data Structures & Algorithms'],
    advanced: ['System Design', 'Software Testing', 'CI/CD Pipelines']
  },
  'Full Stack Developer': {
    beginner: ['HTML', 'CSS', 'JavaScript', 'Git'],
    intermediate: ['React', 'Node.js', 'Express.js', 'SQL Databases'],
    advanced: ['TypeScript', 'MongoDB', 'REST APIs', 'Vercel Deployment']
  },
  'Backend Developer': {
    beginner: ['Python', 'SQL Basics', 'Git'],
    intermediate: ['Node.js', 'FastAPI', 'Django', 'PostgreSQL'],
    advanced: ['Docker', 'REST APIs', 'Redis Caching', 'System Design']
  },
  'Frontend Developer': {
    beginner: ['HTML', 'CSS', 'JavaScript', 'Git'],
    intermediate: ['React', 'TypeScript', 'TailwindCSS', 'Redux State Management'],
    advanced: ['Next.js Framework', 'Responsive Design', 'Performance Optimization']
  },
  'AI Engineer': {
    beginner: ['Python', 'Git Basics', 'Mathematics & Linear Algebra'],
    intermediate: ['Natural Language Processing (NLP)', 'OpenAI API', 'Prompt Engineering', 'Vector Databases'],
    advanced: ['LangChain Framework', 'HuggingFace Library', 'Large Language Models (LLMs)', 'Model Fine-tuning']
  },
  'ML Engineer': {
    beginner: ['Python', 'Git Basics', 'Probability & Statistics'],
    intermediate: ['NumPy', 'Pandas', 'Scikit-learn', 'SQL Queries'],
    advanced: ['TensorFlow', 'PyTorch Deep Learning', 'MLflow Tracking', 'Docker Containers']
  },
  'Data Scientist': {
    beginner: ['Python', 'Statistical Concepts', 'Git'],
    intermediate: ['SQL Databases', 'Pandas & DataFrames', 'NumPy', 'Scikit-learn Regression'],
    advanced: ['Data Visualization', 'Machine Learning Algorithms', 'Jupyter Notebooks', 'R Programming']
  },
  'Data Analyst': {
    beginner: ['MS Excel Formulas', 'SQL Basics', 'Data Analysis Fundamentals'],
    intermediate: ['Tableau', 'Power BI Dashboards', 'Python Data Science', 'Pandas Library'],
    advanced: ['Data Cleaning Pipelines', 'Reporting Automation', 'Data Visualization Theory', 'Google Analytics']
  },
  'Cloud Engineer': {
    beginner: ['Linux CLI', 'Networking Fundamentals', 'Git Version Control'],
    intermediate: ['AWS Cloud Services', 'GCP Basics', 'Azure Cloud Services', 'Docker Containers'],
    advanced: ['Terraform IaC', 'Kubernetes Clusters', 'Cloud Security & IAM', 'AWS CloudFormation']
  },
  'DevOps Engineer': {
    beginner: ['Linux OS', 'Git Version Control', 'Bash Scripting'],
    intermediate: ['Docker Containers', 'AWS Architecture', 'CI/CD Pipelines', 'Nginx Web Server'],
    advanced: ['Kubernetes Orchestration', 'Terraform IaC', 'Prometheus Monitoring', 'Grafana Analytics']
  },
  'Cybersecurity Analyst': {
    beginner: ['Computer Networking', 'Linux CLI', 'Security Fundamentals'],
    intermediate: ['Wireshark Network Analysis', 'Firewalls configuration', 'SIEM Tools', 'Threat Intelligence'],
    advanced: ['Metasploit Framework', 'Penetration Testing', 'Cryptography Standards', 'Incident Response Plan']
  },
  
  // Design
  'UI Designer': {
    beginner: ['Figma Layouts', 'Typography Basics', 'Color Theory Principles'],
    intermediate: ['Wireframing & Layouts', 'Interactive Prototyping', 'Visual Hierarchy Design'],
    advanced: ['Design Systems creation', 'Responsive UI Design', 'Figma Auto-Layout components']
  },
  'UX Designer': {
    beginner: ['Figma Basics', 'User Empathy Mapping', 'Design Thinking Framework'],
    intermediate: ['User Research Methods', 'User Flows mapping', 'Information Architecture'],
    advanced: ['Usability Testing', 'Interaction Design details', 'Persona creation']
  },
  'Product Designer': {
    beginner: ['Figma Prototyping', 'Typography principles', 'Wireframing Concepts'],
    intermediate: ['Product Thinking & Strategy', 'Interactive Prototyping', 'Design Systems management'],
    advanced: ['Interaction Design Details', 'User Research Methodologies', 'Developer Handoff guidelines']
  },
  'Graphic Designer': {
    beginner: ['Adobe Photoshop', 'Adobe Illustrator', 'Color Theory Essentials'],
    intermediate: ['Adobe InDesign', 'Branding & Identity', 'Advanced Typography'],
    advanced: ['Vector Art creation', 'Logo Design portfolios', 'Print Production setup']
  },
  'Video Editor': {
    beginner: ['Adobe Premiere Pro', 'Cutting & Splicing', 'Audio Editing Basics'],
    intermediate: ['Adobe After Effects', 'Color Correction & Grading', 'Motion Graphics Templates'],
    advanced: ['DaVinci Resolve studio', 'Sound Design & Mixing', 'Storyboarding workflows']
  },
  'Motion Designer': {
    beginner: ['Adobe After Effects', 'Keyframing animation', 'Adobe Illustrator vector creation'],
    intermediate: ['Cinema 4D tools', '2D Vector Animation', 'Asset Rigging techniques'],
    advanced: ['3D Modeling & Rendering', 'Character Rigging', 'Sound FX Syncing']
  },

  // Product & Strategy
  'Product Manager': {
    beginner: ['Agile Methodology', 'Jira Boards', 'Product Specifications (PRD)'],
    intermediate: ['User Research interviews', 'Product Analytics metrics', 'Roadmapping tools'],
    advanced: ['A/B Testing setups', 'Stakeholder Management', 'Go-To-Market (GTM) Strategy']
  },
  'Program Manager': {
    beginner: ['Project Scheduling', 'Asana Board management', 'Meeting Coordination'],
    intermediate: ['Risk Management registries', 'Resource Allocation', 'Agile/Scrum ceremonies'],
    advanced: ['Program Budgeting', 'Cross-functional Leadership', 'KPI Metric Tracking']
  },
  'Business Analyst': {
    beginner: ['MS Excel Pivot Tables', 'SQL queries', 'Requirement Gathering methodologies'],
    intermediate: ['Process Mapping & Flowcharts', 'Jira backlog grooming', 'Data Visualization dashboards'],
    advanced: ['Financial Modeling', 'Cost-Benefit Analysis', 'UML Diagrams creation']
  },
  'Strategy Associate': {
    beginner: ['MS Excel modeling', 'PowerPoint design', 'Market Research methodologies'],
    intermediate: ['Competitive Analysis frameworks', 'Financial Projections', 'SWOT Analysis matrix'],
    advanced: ['Corporate Strategy initiatives', 'Macro-Economic Data Analysis', 'Industry Forecasting models']
  },

  // Marketing
  'Digital Marketing': {
    beginner: ['Social Media Basics', 'SEO Concepts', 'Email Marketing writing'],
    intermediate: ['Google Analytics metrics', 'Google Ads setup', 'Content Marketing calendars'],
    advanced: ['Copywriting fundamentals', 'A/B Testing Campaigns', 'CRM Marketing Tools']
  },
  'Content Marketing': {
    beginner: ['Content Writing rules', 'Blogging structures', 'Grammatical Standards'],
    intermediate: ['SEO Content writing', 'Content Calendars', 'Social Media Schedulers'],
    advanced: ['Content Strategy planning', 'Ahrefs/Semrush tools', 'Brand Voice Guidelines']
  },
  'SEO Specialist': {
    beginner: ['Keyword Research tools', 'On-Page SEO factors', 'HTML tags basics'],
    intermediate: ['Google Search Console', 'Link Building strategies', 'Google Analytics setup'],
    advanced: ['Technical SEO audits', 'SEO Site audits', 'Ahrefs / Semrush optimization']
  },
  'Growth Associate': {
    beginner: ['MS Excel analysis', 'Content Creation basics', 'Basic Marketing Analytics'],
    intermediate: ['Google Search/Display Ads', 'Email Marketing campaigns', 'A/B testing flows'],
    advanced: ['SQL Queries', 'Conversion Rate Optimization (CRO)', 'Funnel Analytics models']
  },
  'Brand Executive': {
    beginner: ['Brand Identity guidelines', 'Market Research surveys', 'Social Media execution'],
    intermediate: ['Marketing Campaign Management', 'Content Strategy creation', 'Competitor Auditing'],
    advanced: ['Brand Strategy planning', 'PR & Partnerships', 'Marketing Budgeting plans']
  },
  'Social Media Manager': {
    beginner: ['Instagram/TikTok/LinkedIn posting', 'Canva asset design', 'Copywriting for Social Media'],
    intermediate: ['Social Media Analytics tracking', 'Content Planning tools', 'Community Engagement guidelines'],
    advanced: ['Paid Social Advertising', 'Influencer Marketing campaigns', 'Brand voice guidelines']
  },

  // Sales
  'Business Development': {
    beginner: ['Cold Outreach techniques', 'Email pitch writing', 'Communication basics'],
    intermediate: ['Lead Generation tools', 'CRM tools (HubSpot)', 'Negotiation skills'],
    advanced: ['Pitch Deck creation', 'Sales Deal Closing', 'Client Relationship management']
  },
  'Sales Executive': {
    beginner: ['Active Listening habits', 'Product Knowledge manuals', 'Sales Pitching basics'],
    intermediate: ['Objection Handling techniques', 'Pipeline Management frameworks', 'Cold Calling practices'],
    advanced: ['Negotiation & Contract Closing', 'Client Retention programs', 'Sales Revenue Forecasting']
  },
  'Account Manager': {
    beginner: ['Customer Service standards', 'Client Onboarding steps', 'Interpersonal Communication'],
    intermediate: ['CRM database tracking', 'Account Reviews and audits', 'Problem Solving methods'],
    advanced: ['Upselling & Cross-selling programs', 'Contract Renegotiation', 'Customer Retention Metrics']
  },
  'Customer Success': {
    beginner: ['Customer Empathy concepts', 'Product Onboarding steps', 'Customer Support ticketing'],
    intermediate: ['Ticketing Tools (Zendesk)', 'FAQ Base writing', 'SLA metrics tracking'],
    advanced: ['Customer Retention strategy', 'Feedback Loop implementation', 'NPS Analytics tracking']
  },

  // Operations
  'Operations Associate': {
    beginner: ['MS Excel reporting', 'Data Entry accuracy', 'Task Management tracking'],
    intermediate: ['Process Optimization projects', 'Logistics Management basics', 'Vendor Coordination'],
    advanced: ['SOP Creation guidelines', 'Operations Analytics databases', 'Budget Optimization algorithms']
  },
  'Operations Manager': {
    beginner: ['Team Coordination models', 'MS Excel modeling', 'Problem Solving steps'],
    intermediate: ['Resource Planning spreadsheets', 'Process Mapping workshops', 'Vendor Contract Negotiation'],
    advanced: ['Supply Chain Strategy', 'Regulatory Compliance procedures', 'KPI Dashboard dashboards']
  },
  'Supply Chain Associate': {
    beginner: ['Inventory Management models', 'MS Excel calculations', 'Logistics Basics'],
    intermediate: ['Procurement guidelines', 'Warehouse Operations standards', 'Vendor Quality Management'],
    advanced: ['Logistics Analytics dashboards', 'ERP System mapping (SAP)', 'Demand Forecasting models']
  },

  // Community & Events
  'Community Manager': {
    beginner: ['Discord/Slack management', 'Content Creation basics', 'Forum Moderation rules'],
    intermediate: ['Event Hosting workflows', 'Newsletter Content Writing', 'User Feedback Collection'],
    advanced: ['Community Strategy planning', 'Analytics & Insights tools', 'Community Crisis Management']
  },
  'Campus Ambassador': {
    beginner: ['Public Speaking basics', 'Social Media Promotion', 'Student Networking'],
    intermediate: ['Event Planning basics', 'Student Outreach tactics', 'Content Moderation guidance'],
    advanced: ['Partnerships management', 'Feedback Loop tracking', 'Brand Representation guidelines']
  },
  'Event Manager': {
    beginner: ['Event Budgeting basics', 'Vendor Outreach letters', 'Checklist Management tracking'],
    intermediate: ['Scheduling frameworks', 'Venue Sourcing metrics', 'Promotional Campaigns'],
    advanced: ['Risk Management registries', 'Live Event Operations Control', 'Post-Event Analysis reports']
  },
  'Partnerships Associate': {
    beginner: ['Email Outreach templates', 'Communication standards', 'Lead Research methodologies'],
    intermediate: ['Contract Drafting basics', 'CRM Pipeline Tracking', 'Sales Pitch Presentation'],
    advanced: ['Strategic Deal Structuring', 'Sponsor Management campaigns', 'Strategic Partnerships Management']
  },

  // Education
  'Tutor': {
    beginner: ['Subject Area Expertise', 'Patience & Empathy', 'Lesson Planning guides'],
    intermediate: ['Student Progress Tracking tools', 'Interactive Teaching strategies', 'Assignments Design'],
    advanced: ['Standardized Exam Preparation', 'Custom Curriculum Adapting', 'Feedback Delivery metrics']
  },
  'Teaching Assistant': {
    beginner: ['Grading Criteria alignment', 'MS Excel spreadsheets', 'Subject Matter Support'],
    intermediate: ['Office Hours Hosting', 'Lab Session Leading guidelines', 'Exam Proctoring setups'],
    advanced: ['Lecture Backups creation', 'Student Mentoring programs', 'Curriculum Contributions']
  },
  'Curriculum Developer': {
    beginner: ['Learning Objectives framework', 'Subject Area Knowledge', 'Formatting Standards docs'],
    intermediate: ['Quiz & Assessment Creation', 'E-Learning Authoring Tools (Articulate)', 'Syllabus Mapping'],
    advanced: ['Instructional Design methodologies', 'Pedagogical Frameworks', 'Assessment Validation testing']
  },

  // HR & Recruitment
  'Recruiter': {
    beginner: ['Sourcing Candidates', 'Job Posting boards', 'Cold Outreach templates'],
    intermediate: ['Screening Resumes', 'Applicant Tracking Systems (ATS)', 'Interview Scheduling tools'],
    advanced: ['Salary & Compensation Negotiation', 'Onboarding Pipelines', 'Executive Headhunting']
  },
  'Talent Acquisition': {
    beginner: ['Candidate Sourcing', 'LinkedIn Recruiter portal', 'ATS Systems tracking'],
    intermediate: ['Candidate Assessment tools', 'Employer Branding campaigns', 'Interviewing Techniques'],
    advanced: ['Strategic Sourcing plans', 'Diversity & Inclusion Hiring strategy', 'Recruitment Metrics tracking']
  },
  'HR Associate': {
    beginner: ['Data Entry standards', 'Employee Queries resolution', 'Onboarding Paperwork automation'],
    intermediate: ['HR Policy Implementation', 'Conflict Resolution guidelines', 'Benefits Administration'],
    advanced: ['Employee Engagement planning', 'HR Compliance checklists', 'Performance Review workflows']
  },

  // Finance
  'Financial Analyst': {
    beginner: ['MS Excel Formulas', 'Accounting Principles basics', 'Financial Statements reading'],
    intermediate: ['Financial Modeling practices', 'Corporate Finance formulas', 'SQL database queries'],
    advanced: ['Valuation Methods (DCF)', 'Financial Forecasting models', 'Portfolio Tracking sheets']
  },
  'Investment Analyst': {
    beginner: ['Market Research databases', 'Financial Statement Analysis', 'MS Excel modeling'],
    intermediate: ['Company Valuation models', 'Financial Modeling techniques', 'Industry Reports drafting'],
    advanced: ['Investment Pitches templates', 'Portfolio Risk Management strategies', 'M&A Analytics dashboards']
  },
  'Operations Finance': {
    beginner: ['Bookkeeping guidelines', 'MS Excel sheets', 'Invoice Tracking ledgers'],
    intermediate: ['Cost Accounting procedures', 'Budget Monitoring templates', 'Variance Analysis tools'],
    advanced: ['Financial Internal Controls', 'ERP system setup (SAP)', 'Cash Flow Optimization plans']
  },

  // Media & Content
  'Content Writer': {
    beginner: ['Blog post writing', 'Article Structuring guidelines', 'Proofreading rules'],
    intermediate: ['SEO Copywriting', 'Keyword Integration strategies', 'Content Management Systems (CMS)'],
    advanced: ['Technical Document Writing', 'Content Editing & Directing', 'Content Strategy mapping']
  },
  'Copywriter': {
    beginner: ['Headline Writing principles', 'Persuasive Writing strategies', 'Basic layouts'],
    intermediate: ['Advertising Copywriting', 'A/B Testing Headlines', 'Email Sequencing setups'],
    advanced: ['Brand Voice creation', 'Landing Page Copy optimization', 'Conversion Optimization audits']
  },
  'Script Writer': {
    beginner: ['Storytelling structures', 'Dialogue Writing tips', 'Formatting Script layouts'],
    intermediate: ['Character Development guidelines', 'Pacing & Structure tools', 'Storyboard Collaboration'],
    advanced: ['Screenplay Formatting standards', 'Pitching Scripts to studios', 'Dialogue Directing guidance']
  },
  'Content Strategist': {
    beginner: ['Content Calendar setups', 'SEO basics', 'Blogging structures'],
    intermediate: ['Content Audit templates', 'Audience Segmentation models', 'Google Analytics insights'],
    advanced: ['SEO Strategy development', 'Content Funnel Mapping', 'Multi-channel Distribution systems']
  },

  // Blue Collar & Skilled Trades
  'Electrician': {
    beginner: ['Electrical Safety protocols', 'Circuit Schematics reading', 'Hand Tools safety'],
    intermediate: ['Wiring Systems installation', 'Multimeters operations', 'Electrical Troubleshooting'],
    advanced: ['National Electrical Code (NEC) standards', 'Industrial Control wiring', 'Power Distribution networks']
  },
  'Technician': {
    beginner: ['Troubleshooting Hardware', 'Maintenance Basics manuals', 'Safety SOPs checklists'],
    intermediate: ['Equipment Calibration tools', 'Diagnostic processes', 'Signal Testing tools'],
    advanced: ['System Commissioning', 'Advanced Repair Procedures', 'Quality Inspections standard']
  },
  'Mechanic': {
    beginner: ['Engine Mechanics principles', 'Hand/Power Tools safety', 'Safety Controls checks'],
    intermediate: ['Automotive Diagnostics software', 'Hydraulic Systems troubleshooting', 'Brake/Suspension Repairs'],
    advanced: ['Engine Tuning operations', 'Electrical Diagnostics procedures', 'Transmission Overhauling projects']
  },
  'Machine Operator': {
    beginner: ['Machine Safety locks', 'Basic Calibration procedures', 'Raw Material Checking checklists'],
    intermediate: ['CNC Programming guides', 'Production Cycle Monitoring', 'Routine Maintenance steps'],
    advanced: ['Quality Assurance Inspections', 'Process Optimization benchmarks', 'Industrial Tooling setup']
  },
  'Field Technician': {
    beginner: ['Customer Communication tips', 'Basic Installations SOPs', 'Tool Operation safety'],
    intermediate: ['On-site Diagnostics processes', 'Network Troubleshooting checks', 'System Maintenance standards'],
    advanced: ['Complex System Installations', 'Service SLA Compliance rules', 'SOP Adherence audits']
  },
  'Maintenance Engineer': {
    beginner: ['Preventive Maintenance checklists', 'Safety Lockout Tagout (LOTO)', 'Hand Tools inspection'],
    intermediate: ['Pneumatics & Hydraulics repair', 'HVAC Systems troubleshooting', 'Electrical Troubleshooting'],
    advanced: ['Root Cause Analysis (RCA)', 'Maintenance Schedules Planning', 'Total Productive Maintenance (TPM)']
  }
}

// 2. Curated learning resources index
const LEARN_RESOURCES: Record<string, { title: string; url: string; type: string }[]> = {
  'HTML': [{ title: 'HTML Basic Structure (MDN Docs)', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', type: 'Docs' }],
  'CSS': [{ title: 'CSS Layouts and Flexbox (CSS-Tricks)', url: 'https://css-tricks.com/', type: 'Tutorial' }],
  'JavaScript': [{ title: 'JavaScript Beginners Guide', url: 'https://javascript.info/', type: 'Tutorial' }],
  'Git': [{ title: 'Interactive Git Branching Guide', url: 'https://learngitbranching.js.org/', type: 'Interactive' }],
  'Python': [{ title: 'Python Beginners Guide', url: 'https://www.python.org/about/gettingstarted/', type: 'Docs' }],
  'SQL': [{ title: 'SQL Zoo Interactive SQL course', url: 'https://sqlzoo.net/', type: 'Tutorial' }],
  'Figma': [{ title: 'Figma Design System Learn Portal', url: 'https://learn.figma.com/', type: 'Course' }],
  'Jira': [{ title: 'Jira Software Support guides', url: 'https://www.atlassian.com/software/jira/guides', type: 'Docs' }],
  'React': [{ title: 'React Official Docs & Quickstart', url: 'https://react.dev/', type: 'Docs' }],
  'TypeScript': [{ title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/', type: 'Docs' }],
  'Excel': [{ title: 'Excel Advanced Pivot Charts (Chandoo)', url: 'https://chandoo.org/wp/excel-pivot-tables/', type: 'Tutorial' }],
  'AWS': [{ title: 'AWS Skill Builder learning path', url: 'https://skillbuilder.aws/', type: 'Course' }],
  'Docker': [{ title: 'Docker Official Get Started Guides', url: 'https://docs.docker.com/get-started/', type: 'Docs' }],
  'Kubernetes': [{ title: 'Kubernetes Official Tutorials', url: 'https://kubernetes.io/docs/tutorials/', type: 'Docs' }],
  'SEO': [{ title: 'Moz Beginners Guide to SEO', url: 'https://moz.com/beginners-guide-to-seo', type: 'Docs' }],
  'Google Analytics': [{ title: 'Google Analytics Academy', url: 'https://analytics.google.com/analytics/academy/', type: 'Course' }],
  'Electrical Safety': [{ title: 'OSHA Electrical Safety Standards', url: 'https://www.osha.gov/electrical', type: 'Docs' }],
  'Sourcing': [{ title: 'Recruiting & Sourcing Guide', url: 'https://www.socialtalents.com/', type: 'Blog' }],
  'Accounting Principles': [{ title: 'Accounting Coach fundamentals', url: 'https://www.accountingcoach.com/', type: 'Tutorial' }]
}

function getDefaultResources(skill: string) {
  return [
    { title: `${skill} on freeCodeCamp`, url: `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(skill)}`, type: 'Tutorial' },
    { title: `${skill} — YouTube Tutorial`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`, type: 'Video' }
  ]
}

// 3. Category projects template mapping
const CATEGORY_PROJECTS: Record<string, { name: string; description: string; tech: string[]; hours: number }[]> = {
  'Technology': [
    { name: 'Full-Stack Web App Pipeline', description: 'Build a containerized REST API application with authentication, database migrations, and CI/CD testing scripts.', tech: ['React', 'Docker', 'PostgreSQL', 'GitHub Actions'], hours: 40 },
    { name: 'Model Optimization & Deployment', description: 'Train a machine learning classification pipeline, track experiment metrics with MLflow, and deploy it as a high-performance REST endpoint.', tech: ['Python', 'Scikit-learn', 'FastAPI'], hours: 30 }
  ],
  'Design': [
    { name: 'Complete UI/UX Design System', description: 'Design high-fidelity user workflows, establish responsive auto-layout structures, and perform prototype user tests on a responsive SaaS design.', tech: ['Figma', 'Typography', 'Prototyping'], hours: 25 },
    { name: 'Branding Guidelines & Media Campaign', description: 'Create vector logos, color boards, and generate creative marketing graphic/motion assets for a brand refresh.', tech: ['Adobe Illustrator', 'Photoshop', 'After Effects'], hours: 20 }
  ],
  'Product & Strategy': [
    { name: 'Product Spec Sheet & Backlog Roadmap', description: 'Author a complete Product Requirement Document (PRD) detailing user stories, roadmaps, and metric boards on Jira.', tech: ['Agile', 'Jira', 'Roadmapping'], hours: 15 },
    { name: 'Strategic Market Assessment Report', description: 'Execute comprehensive competitive analysis, process mapping, and financial projections for a new product strategy launch.', tech: ['Process Mapping', 'SWOT Analysis', 'Financial Modeling'], hours: 20 }
  ],
  'Marketing': [
    { name: 'Targeted Growth Campaign Setup', description: 'Bootstrap a multi-channel digital acquisition campaign, detailing SEO optimization, Google Ads keywords triggers, and key funnel metrics.', tech: ['SEO', 'Google Analytics', 'A/B Testing'], hours: 20 },
    { name: 'Social Media Organic Content Playbook', description: 'Build a 30-day social media engagement calendar, mapping audience segments, analytics tracking, and asset briefs.', tech: ['Social Media Analytics', 'Canva', 'Copywriting'], hours: 15 }
  ],
  'Sales': [
    { name: 'Outbound Prospecting Pipeline Architecture', description: 'Set up lead tracking models, configure CRM dashboard templates, and script cold outreach sequences.', tech: ['CRM', 'Lead Generation', 'Email Outreach'], hours: 15 },
    { name: 'Strategic Accounts Onboarding Playbook', description: 'Draft client onboarding guides, SLA tracking metrics, and custom upselling scripts.', tech: ['Product Onboarding', 'Customer Success', 'Communication'], hours: 20 }
  ],
  'Operations': [
    { name: 'Process Standard Operating Procedure (SOP) Audit', description: 'Map operational bottleneck charts, draft execution checklists, and set vendor SLA KPIs.', tech: ['Process Optimization', 'SOP Creation', 'Excel'], hours: 18 },
    { name: 'Inventory Replenishment & Supply Chain Model', description: 'Build a demand forecasting sheet with automated restock thresholds and supplier tracking indices.', tech: ['Excel', 'Inventory Management', 'Logistics'], hours: 22 }
  ],
  'Community & Events': [
    { name: 'Ambassador Portal & Community Playbook', description: 'Build community moderation flows, schedule hosting schedules, and draft ambassador guides.', tech: ['Discord/Slack', 'Community Engagement', 'Event Hosting'], hours: 15 },
    { name: 'Comprehensive Event Operations Plan', description: 'Draft full event budgets, coordination checklists, post-event survey workflows, and sponsor decks.', tech: ['Event Planning', 'Budgeting', 'Partnerships'], hours: 20 }
  ],
  'Education': [
    { name: 'Curriculum Outline & Assessment Package', description: 'Draft a module-by-module course syllabus, defining learning objectives, lecture scripts, and assessment banks.', tech: ['Instructional Design', 'Lesson Planning', 'Assignments Design'], hours: 18 },
    { name: 'Interactive Subject Resource Playbook', description: 'Formulate student study guides, interactive laboratory steps, and grading guides.', tech: ['Subject Support', 'Interactive Teaching', 'Feedback Delivery'], hours: 14 }
  ],
  'HR & Recruitment': [
    { name: 'Recruitment Funnel & Candidate Sourcing Playbook', description: 'Establish hiring templates, configure ATS workflow stages, and draft employer branding outreach briefs.', tech: ['ATS Systems', 'LinkedIn Recruiter', 'Sourcing'], hours: 15 },
    { name: 'Employee Engagement & Policy Standard Package', description: 'Formulate employee policy guidelines, exit interview templates, and performance review workflows.', tech: ['Policy Implementation', 'HR Compliance', 'Employee Engagement'], hours: 18 }
  ],
  'Finance': [
    { name: 'Three-Statement Financial Model & Valuation', description: 'Construct historical sheets, forecast revenue streams, and calculate DCF valuations.', tech: ['Excel', 'Financial Modeling', 'Valuation Methods'], hours: 25 },
    { name: 'Operational Budget & Cost Accounting Sheet', description: 'Design budget control dashboards, track variances, and optimize operating cash flows.', tech: ['Cost Accounting', 'Variance Analysis', 'ERP Systems'], hours: 20 }
  ],
  'Media & Content': [
    { name: 'SEO Content Writing & Keywords Strategy Portfolio', description: 'Author blog articles, structure SEO keyword calendars, and detail CMS formatting guidelines.', tech: ['Blogging', 'SEO Copywriting', 'Content Strategy'], hours: 15 },
    { name: 'Narrative Script & Scriptwriting Pitch Package', description: 'Write a narrative script outline, complete with character profiles, storyboards, and scripts.', tech: ['Storytelling', 'Script Formatting', 'Pacing & Structure'], hours: 22 }
  ],
  'Blue Collar & Skilled Trades': [
    { name: 'Preventive Maintenance & Safety Lockout SOP', description: 'Establish scheduled maintenance schedules, verify safety protocols (LOTO), and draft diagnostics steps.', tech: ['Preventive Maintenance', 'Safety Controls', 'Troubleshooting'], hours: 20 },
    { name: 'Equipment Assembly & Calibration Project', description: 'Analyze mechanical schematics, assemble/disassemble components, and execute multimeter verification tests.', tech: ['Hand Tools', 'Diagnostics', 'Calibration'], hours: 25 }
  ]
}

function getRoleCategory(roleName: string): string {
  const techRoles = ['Software Engineer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'AI Engineer', 'ML Engineer', 'Data Scientist', 'Data Analyst', 'Cloud Engineer', 'DevOps Engineer', 'Cybersecurity Analyst'];
  const designRoles = ['UI Designer', 'UX Designer', 'Product Designer', 'Graphic Designer', 'Video Editor', 'Motion Designer'];
  const prodRoles = ['Product Manager', 'Program Manager', 'Business Analyst', 'Strategy Associate'];
  const marketingRoles = ['Digital Marketing', 'Content Marketing', 'SEO Specialist', 'Growth Associate', 'Brand Executive', 'Social Media Manager'];
  const salesRoles = ['Business Development', 'Sales Executive', 'Account Manager', 'Customer Success'];
  const opsRoles = ['Operations Associate', 'Operations Manager', 'Supply Chain Associate'];
  const commRoles = ['Community Manager', 'Campus Ambassador', 'Event Manager', 'Partnerships Associate'];
  const eduRoles = ['Tutor', 'Teaching Assistant', 'Curriculum Developer'];
  const hrRoles = ['Recruiter', 'Talent Acquisition', 'HR Associate'];
  const finRoles = ['Financial Analyst', 'Investment Analyst', 'Operations Finance'];
  const mediaRoles = ['Content Writer', 'Copywriter', 'Script Writer', 'Content Strategist'];
  
  if (techRoles.includes(roleName)) return 'Technology';
  if (designRoles.includes(roleName)) return 'Design';
  if (prodRoles.includes(roleName)) return 'Product & Strategy';
  if (marketingRoles.includes(roleName)) return 'Marketing';
  if (salesRoles.includes(roleName)) return 'Sales';
  if (opsRoles.includes(roleName)) return 'Operations';
  if (commRoles.includes(roleName)) return 'Community & Events';
  if (eduRoles.includes(roleName)) return 'Education';
  if (hrRoles.includes(roleName)) return 'HR & Recruitment';
  if (finRoles.includes(roleName)) return 'Finance';
  if (mediaRoles.includes(roleName)) return 'Media & Content';
  return 'Blue Collar & Skilled Trades';
}

function GapsInner() {
  const searchParams = useSearchParams()
  const [userName, setUserName] = useState('')
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [targetRole, setTargetRole] = useState('Full Stack Developer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    fetch('http://localhost:8000/dashboard/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthenticated')
        return res.json()
      })
      .then(dashData => {
        if (!dashData.resume_profile) {
          window.location.href = '/onboarding'
          return
        }

        setUserName(dashData.user.full_name || 'Candidate')
        const skills = dashData.resume_profile.skills || []
        setUserSkills(skills)

        const validRoles = Object.keys(ROLE_SKILLS)

        // Priority 1: ?role= query parameter
        const queryRole = searchParams.get('role')
        if (queryRole && validRoles.includes(queryRole)) {
          setTargetRole(queryRole)
        } else {
          // Priority 2: user preferences
          const prefRoles = dashData.preferences?.preferred_roles || []
          const matchedPref = prefRoles.find((r: string) => validRoles.includes(r))
          if (matchedPref) {
            setTargetRole(matchedPref)
          } else if (validRoles.includes(prefRoles[0])) {
            setTargetRole(prefRoles[0])
          }
        }

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        localStorage.removeItem('token')
        window.location.href = '/login'
      })
  }, [searchParams])

  // Get skills mapping for target role
  const roleStructure = ROLE_SKILLS[targetRole] || { beginner: [], intermediate: [], advanced: [] }
  const standardSkills = [...roleStructure.beginner, ...roleStructure.intermediate, ...roleStructure.advanced]
  
  // Normalize skills check
  const possessedSkills = standardSkills.filter(skill => 
    userSkills.some(us => {
      const usL = us.toLowerCase().trim()
      const sL = skill.toLowerCase().trim()
      return usL === sL || usL.includes(sL) || sL.includes(usL)
    })
  )

  const missingSkills = standardSkills.filter(skill => !possessedSkills.includes(skill))
  const readinessPct = Math.round((possessedSkills.length / Math.max(standardSkills.length, 1)) * 100)

  // Subdivided missing skills roadmap
  const beginnerMissing = roleStructure.beginner.filter(s => missingSkills.includes(s))
  const intermediateMissing = roleStructure.intermediate.filter(s => missingSkills.includes(s))
  const advancedMissing = roleStructure.advanced.filter(s => missingSkills.includes(s))

  // Retrieve projects
  const roleCategory = getRoleCategory(targetRole)
  const baseProjects = CATEGORY_PROJECTS[roleCategory] || CATEGORY_PROJECTS['Technology']
  const projects = baseProjects.map(proj => ({
    ...proj,
    name: proj.name.replace('Full-Stack Web App', targetRole),
    description: proj.description.replace('containerized REST API application', `practical project for a starting ${targetRole}`),
  }))

  const renderRoadmapItem = (skill: string, index: number, totalIdx: number) => {
    const resources = LEARN_RESOURCES[skill] || getDefaultResources(skill)
    return (
      <div key={skill} className="neo-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderLeft: '8px solid var(--indigo)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900 }}>STEP {String(totalIdx + 1).padStart(2, '0')}</div>
          <div>
            <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 15 }}>{skill}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 900, marginTop: 4, textTransform: 'uppercase' }}>
              Priority: <strong style={{ color: 'var(--red)' }}>High</strong> · Est. Time: 25 Hours
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {resources.slice(0, 2).map((r, rIdx) => (
            <a key={rIdx} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="neo-btn" style={{ fontSize: 11, padding: '6px 12px', background: r.type === 'Video' || r.type === 'Course' ? 'var(--amber)' : 'var(--bg-2)', color: r.type === 'Video' || r.type === 'Course' ? '#000000' : 'var(--text)' }}>
                {r.type.toUpperCase()}: {r.title.length > 22 ? r.title.slice(0, 20) + '...' : r.title} ↗
              </button>
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg)' }}>
        <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 16, border: '4px solid var(--border)', background: '#000000', padding: '12px 24px', boxShadow: '6px 6px 0px var(--shadow)' }}>CALCULATING ROLE GAPS...</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, fontFamily: 'Space Grotesk' }}>ANALYZING RESUME SKILLS AGAINST CAREER STANDARDS</div>
      </div>
    )
  }

  let cumulativeIdx = 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      <NavBar name={userName} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.1em', fontWeight: 900, marginBottom: '0.5rem' }}>CAREER INTELLIGENCE</p>
          <h1 className="font-display" style={{ fontSize: 38, fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>ROLE-SPECIFIC SKILL GAP</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 700 }}>
            Compare your resume skills directly against industry standards for your target career path.
          </p>
        </div>

        {/* Dropdown Selector card */}
        <div className="neo-card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Space Grotesk', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>SELECTED TARGET ROLE</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--indigo)', textTransform: 'uppercase' }}>{targetRole}</div>
          </div>
          <select 
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            className="neo-input"
            style={{ 
              height: 48, 
              padding: '0 16px', 
              fontFamily: 'Space Grotesk', 
              fontWeight: 900, 
              fontSize: 14, 
              cursor: 'pointer',
              border: '3px solid var(--border)',
              background: 'var(--bg-2)',
              boxShadow: '3px 3px 0px var(--shadow)',
              minWidth: 260
            }}
          >
            {Object.keys(ROLE_SKILLS).sort().map(role => (
              <option key={role} value={role}>{role.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Readiness Meter Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: '2rem' }}>
          
          {/* Readiness gauge */}
          <div className="neo-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* Brutalist Circle Border */}
              <div style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                border: '6px solid var(--border)', 
                background: 'var(--bg-3)',
                boxShadow: '4px 4px 0px var(--shadow)',
                zIndex: 0
              }} />
              
              {/* Readiness Text */}
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: readinessPct >= 70 ? 'var(--green)' : readinessPct >= 40 ? 'var(--amber)' : 'var(--red)', fontFamily: 'Space Grotesk' }}>{readinessPct}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900, fontFamily: 'Space Grotesk', textTransform: 'uppercase' }}>READY</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, marginTop: '1.5rem' }}>
              Your resume matches <strong style={{color:'var(--indigo)'}}>{possessedSkills.length} out of {standardSkills.length}</strong> core skills required for {targetRole} positions.
            </div>
          </div>

          {/* Breakdown column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Possessed */}
            <div className="neo-card" style={{ padding: '1.25rem', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span> CURRENT STRENGTHS ({possessedSkills.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {possessedSkills.map(s => (
                  <span key={s} className="tag tag-match" style={{ fontSize: 11, padding: '4px 8px' }}>{s}</span>
                ))}
                {possessedSkills.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>None found in resume.</span>}
              </div>
            </div>

            {/* Missing */}
            <div className="neo-card" style={{ padding: '1.25rem', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'Space Grotesk', fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✦</span> MISSING SKILL GAPS ({missingSkills.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {missingSkills.map(s => (
                  <span key={s} className="tag tag-skill" style={{ fontSize: 11, padding: '4px 8px', borderColor: 'var(--red)', color: 'var(--text)' }}>{s}</span>
                ))}
                {missingSkills.length === 0 && <span className="neo-badge" style={{ background: 'var(--green)', color: '#000000', fontSize: 10 }}>100% COMPLETE</span>}
              </div>
            </div>
          </div>

        </div>

        {/* Sequential Roadmap Section (Beginner -> Intermediate -> Advanced) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>Learning Roadmap</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Beginner Stage */}
            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '3px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--indigo)' }}>Stage 1: Foundational (Beginner)</span>
                <span className="neo-badge" style={{ background: beginnerMissing.length === 0 ? 'var(--green)' : 'var(--amber)', color: '#000000', fontSize: 10 }}>
                  {beginnerMissing.length === 0 ? 'COMPLETED' : `${beginnerMissing.length} GAPS`}
                </span>
              </div>
              {beginnerMissing.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {beginnerMissing.map((skill, idx) => {
                    const item = renderRoadmapItem(skill, idx, cumulativeIdx)
                    cumulativeIdx++
                    return item
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700, fontStyle: 'italic' }}>
                  You already possess all foundational skills in this stage!
                </div>
              )}
            </div>

            {/* Intermediate Stage */}
            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '3px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--amber)' }}>Stage 2: Application (Intermediate)</span>
                <span className="neo-badge" style={{ background: intermediateMissing.length === 0 ? 'var(--green)' : 'var(--amber)', color: '#000000', fontSize: 10 }}>
                  {intermediateMissing.length === 0 ? 'COMPLETED' : `${intermediateMissing.length} GAPS`}
                </span>
              </div>
              {intermediateMissing.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {intermediateMissing.map((skill, idx) => {
                    const item = renderRoadmapItem(skill, idx, cumulativeIdx)
                    cumulativeIdx++
                    return item
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700, fontStyle: 'italic' }}>
                  You already possess all application skills in this stage!
                </div>
              )}
            </div>

            {/* Advanced Stage */}
            <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '3px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: 'var(--red)' }}>Stage 3: Specialization (Advanced)</span>
                <span className="neo-badge" style={{ background: advancedMissing.length === 0 ? 'var(--green)' : 'var(--amber)', color: '#000000', fontSize: 10 }}>
                  {advancedMissing.length === 0 ? 'COMPLETED' : `${advancedMissing.length} GAPS`}
                </span>
              </div>
              {advancedMissing.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {advancedMissing.map((skill, idx) => {
                    const item = renderRoadmapItem(skill, idx, cumulativeIdx)
                    cumulativeIdx++
                    return item
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 700, fontStyle: 'italic' }}>
                  You already possess all specialization skills in this stage!
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Suggested Projects to Close the Gap */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>Suggested Projects to Close Gaps</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {projects.map((proj, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-2)', transform: idx === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="font-mono" style={{ fontSize: 11, color: 'var(--indigo)', fontWeight: 900 }}>EST. EFFORT: {proj.hours} HOURS</span>
                    <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000', fontSize: 9, padding: '2px 6px' }}>PRACTICE PROJECT</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{proj.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 700, marginBottom: '1.25rem' }}>{proj.description}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                    {proj.tech.map(t => (
                      <span key={t} className="tag tag-skill" style={{ fontSize: 10, padding: '2px 6px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learn order summary */}
        <div className="neo-card" style={{ padding: '1.5rem', background: 'var(--amber-dim)', border: '4px solid var(--border)', boxShadow: '6px 6px 0px var(--shadow)', transform: 'rotate(-0.5deg)' }}>
          <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000000', background: 'var(--amber)', display: 'inline-block', padding: '2px 8px', border: '2px solid var(--border)' }}>ANALYSIS GUIDELINE</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, fontWeight: 700, marginTop: 10 }}>
            Focus on the step-by-step learning path above. Adding these targeted skills to your profile will automatically boost your recommendation scores for relevant {targetRole} internship roles.
          </div>
        </div>

      </div>
    </div>
  )
}

export default function GapsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="font-mono" style={{ color: 'var(--amber)', fontSize: 16, border: '4px solid var(--border)', background: '#000000', padding: '12px 24px', boxShadow: '6px 6px 0px var(--shadow)' }}>LOADING SKILL GAPS...</div>
      </div>
    }>
      <GapsInner />
    </Suspense>
  )
}
