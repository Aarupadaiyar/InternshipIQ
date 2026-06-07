import { Job } from './types'

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'ML Engineering Intern',
    company: 'Scale AI',
    location: 'San Francisco, CA',
    type: 'Hybrid',
    salary: '$45–55/hr',
    source: 'Greenhouse',
    sourceUrl: 'https://boards.greenhouse.io/scaleai',
    postedAt: '2025-06-04',
    description: 'Join our ML platform team to build training data pipelines and evaluation frameworks for frontier AI models. Work directly with research teams on quality and scale.',
    requiredSkills: ['Python', 'PyTorch', 'SQL', 'Data Pipelines', 'Machine Learning'],
  },
  {
    id: '2',
    title: 'Data Science Intern',
    company: 'Razorpay',
    location: 'Bangalore, India',
    type: 'Hybrid',
    salary: '₹60,000–80,000/mo',
    source: 'Lever',
    sourceUrl: 'https://razorpay.com/jobs',
    postedAt: '2025-06-03',
    description: 'Build predictive models for fraud detection and transaction risk scoring. Work with petabyte-scale transaction data using modern ML stacks.',
    requiredSkills: ['Python', 'Pandas', 'Scikit-learn', 'SQL', 'Statistics'],
  },
  {
    id: '3',
    title: 'AI Research Intern',
    company: 'Cohere',
    location: 'Remote',
    type: 'Remote',
    salary: '$40–50/hr',
    source: 'Ashby',
    sourceUrl: 'https://cohere.com/careers',
    postedAt: '2025-06-02',
    description: 'Research and implement improvements to large language models, including fine-tuning strategies, RLHF, and evaluation methodologies.',
    requiredSkills: ['Python', 'PyTorch', 'NLP', 'Transformers', 'Research'],
  },
  {
    id: '4',
    title: 'Software Engineering Intern — ML Infra',
    company: 'Stripe',
    location: 'Remote',
    type: 'Remote',
    salary: '$55–65/hr',
    source: 'Greenhouse',
    sourceUrl: 'https://boards.greenhouse.io/stripe',
    postedAt: '2025-06-01',
    description: 'Build the ML infrastructure powering Stripe Radar, our fraud detection product. Work on model serving, feature pipelines, and experiment tracking at global scale.',
    requiredSkills: ['Python', 'Java', 'Distributed Systems', 'ML Ops', 'Kubernetes'],
  },
  {
    id: '5',
    title: 'Data Engineering Intern',
    company: 'Swiggy',
    location: 'Bangalore, India',
    type: 'On-site',
    salary: '₹50,000–70,000/mo',
    source: 'Lever',
    sourceUrl: 'https://careers.swiggy.com',
    postedAt: '2025-06-01',
    description: 'Design and build data pipelines that process millions of orders daily. Work on real-time streaming, batch ETL, and data quality frameworks.',
    requiredSkills: ['Python', 'Spark', 'Kafka', 'SQL', 'Airflow'],
  },
  {
    id: '6',
    title: 'ML Platform Intern',
    company: 'Weights & Biases',
    location: 'Remote',
    type: 'Remote',
    salary: '$45–55/hr',
    source: 'Ashby',
    sourceUrl: 'https://wandb.ai/careers',
    postedAt: '2025-05-31',
    description: 'Improve the experiment tracking and model monitoring platform used by thousands of ML researchers worldwide. Full-stack work touching Python SDK and React dashboards.',
    requiredSkills: ['Python', 'React', 'Machine Learning', 'REST APIs', 'TypeScript'],
  },
  {
    id: '7',
    title: 'NLP Engineering Intern',
    company: 'Sarvam AI',
    location: 'Bangalore, India',
    type: 'On-site',
    salary: '₹70,000–90,000/mo',
    source: 'YC Jobs',
    sourceUrl: 'https://www.ycombinator.com/companies/sarvam-ai',
    postedAt: '2025-05-30',
    description: 'Build NLP models for Indic languages including Hindi, Tamil, and Telugu. Work on speech recognition, translation, and text understanding at scale.',
    requiredSkills: ['Python', 'PyTorch', 'NLP', 'HuggingFace', 'Linguistics'],
  },
  {
    id: '8',
    title: 'Backend Engineering Intern',
    company: 'Linear',
    location: 'Remote',
    type: 'Remote',
    salary: '$50–60/hr',
    source: 'Ashby',
    sourceUrl: 'https://linear.app/careers',
    postedAt: '2025-05-29',
    description: 'Work on the core infrastructure powering Linear — one of the fastest-growing developer tools. High ownership, real impact on a product used by top engineering teams globally.',
    requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'Redis'],
  },
]

export function computeMatch(job: Job, userSkills: string[]): Job {
  const userSkillsLower = userSkills.map(s => s.toLowerCase())
  const requiredLower = job.requiredSkills.map(s => s.toLowerCase())

  const matched = requiredLower.filter(s => userSkillsLower.some(u => u.includes(s) || s.includes(u)))
  const skillRatio = matched.length / Math.max(requiredLower.length, 1)

  const skillMatch = Math.round(skillRatio * 25)
  const resumeMatch = Math.round(Math.min(skillRatio * 1.4, 1) * 40)
  const experience = Math.round(10 + Math.random() * 5)
  const location = 10
  const preferences = 10

  const total = Math.min(skillMatch + resumeMatch + experience + location + preferences, 99)

  const skillGaps = requiredLower
    .filter(s => !userSkillsLower.some(u => u.includes(s) || s.includes(u)))
    .map(s => job.requiredSkills[requiredLower.indexOf(s)])

  return {
    ...job,
    matchScore: total,
    matchBreakdown: { resumeMatch, skillMatch, experience, location, preferences, total },
    skillGaps,
  }
}
