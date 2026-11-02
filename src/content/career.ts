// Tripp's career: the one source for the homepage and its print-only resume,
// and so the PDF. Written with him from his resume and an interview about his
// GoFundMe work: the detail goes to his recent years, and his earlier roles
// keep their best one or two lines. `WORK` tells the projects behind those
// lines for the homepage, from the same facts, with their numbers.

import { CREDLY, EMAIL, GITHUB, LINKEDIN } from '@/lib/site'

export type Impact = { value: string; label: string }

// A stretch of a role doing different work, told on its own
export type Phase = {
  label: string
  dates: string
  start: string
  end: string
  highlights: string[]
}

export type Role = {
  title: string
  org: string
  place: string
  // As printed, e.g. "Apr 2023 – Oct 2026", and as months for the timeline
  dates: string
  start: string
  end: string
  highlights: string[]
  // Newest first, in place of the role's own highlights
  phases?: Phase[]
}

export const PROFILE = {
  name: 'Tripp Horbinski',
  headline: 'Senior Software Engineer',
  location: 'Milwaukee, Wisconsin (open to remote or relocation)',
  // His line under his name, first on the page: the title he's held, which a
  // recruiter knows at a glance, and short, so the meadow keeps the screen.
  // His range is for his intro and his numbers to show
  tagline: 'Senior Software Engineer',
  // What he's looking for and where he's based (the meadow is in Colorado, he
  // isn't), closing his intro and again in getting in touch. Both lanes on
  // purpose: his tailored resumes do the steering, application by application
  openTo: 'Looking for Senior/Staff software engineering roles, platform or full stack. Based in Milwaukee, open to remote or relocating.',
  // Leading his selected work, in his voice: how he builds now, in a line
  practice:
    'The projects behind those numbers, newest first. These days I build with Claude Code across the whole lifecycle, from PRDs and scoping to QA.',
  // The homepage's summary, in his voice
  intro:
    'I’m a software engineer who has built both the platform and the product on top of it. I spent six years on how software ships, CI/CD and cloud infrastructure, at Northwestern Mutual, Veda, Cardless and GoFundMe. In 2025 I moved to building GoFundMe Pro itself, full stack, on the platform I’d helped build, so I know what each side needs from the other.',
  // The resume's
  summary:
    'Senior software engineer with 8 years of experience across platform and product. Six years in cloud and DevOps, owning how software ships from commit to production, then nearly two building GoFundMe Pro full stack, on that platform, in TypeScript, Next.js, Laravel and AWS. AWS Golden Jacket recipient.',
  contact: [
    { label: 'Email', href: `mailto:${EMAIL}`, text: EMAIL },
    { label: 'LinkedIn', href: LINKEDIN, text: 'in/tripp-horbinski' },
    { label: 'GitHub', href: GITHUB, text: 'tripp-horbinski' },
    { label: 'Web', href: 'https://tripp.horbin.ski/', text: 'tripp.horbin.ski' },
  ],
}

// Newest first, the way a resume reads
export const ROLES: Role[] = [
  {
    title: 'Senior Software Engineer',
    org: 'GoFundMe',
    place: 'Remote',
    dates: 'Apr 2023 – Oct 2026',
    start: '2023-04',
    end: '2026-10',
    highlights: [],
    phases: [
      {
        label: 'Full stack, GoFundMe Pro',
        dates: 'Jan 2025 – Oct 2026',
        start: '2025-01',
        end: '2026-10',
        highlights: [
          'Technical lead for four product areas in moving GoFundMe Pro from classy.org to pro.gofundme.com (Nov 2025 – Mar 2026), brought on by a senior staff engineer as the platform’s subject-matter expert: Campaign Studio and the rendering engine for new campaigns, the live events platform, the Pro Services backend that call centers use on behalf of enterprise nonprofits, and the developer documentation site. The move touched 27 repositories, under millions of daily transactions, and used a dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda for flag-driven rollout and fast rollback, which proved out when a rollback restored service for an enterprise customer’s weekend live event without compromising the migration timeline.',
          'Led the redesign of the annual summary receipts, about 2 million generated each January: moved them from a Lambda workload that timed out and retried into an ECS Fargate task on the primary API, won buy-in from the architecture decision makers, and added what wasn’t possible before: receipts on demand, requested by donors or sent by nonprofit admins on their behalf, and year-to-date summaries. The January 2026 run had no issues or incidents.',
          'Cut CI pipeline time from 17 to 10 minutes (about 41%) through dependency upgrades, a pnpm migration and selective test execution, and added ephemeral preview environments for AI-agent and developer iteration.',
          'Built reporting, data and onboarding features in the admin nonprofit administrators use to run their fundraising.',
          'On Post-Donate, worked on everything a donor sees after giving: the thank-you page, transactional emails, and the start of share attribution.',
          'Used Claude across the development lifecycle, from PRDs and scoping to QA.',
        ],
      },
      {
        label: 'Cloud and platform',
        dates: 'Apr 2023 – Dec 2024',
        start: '2023-04',
        end: '2024-12',
        highlights: [
          'Built reusable GitHub Actions workflows and self-hosted runners that moved GoFundMe Pro off Bitbucket and AWS CodePipeline, across 8 engineering teams.',
          'Led the migration of a sharded MongoDB cluster from self-managed EC2 to MongoDB Atlas with zero customer-facing downtime, and of the Kong API platform from EC2 to ECS.',
          'Mentored engineers through GoFundMe’s mentorship program.',
        ],
      },
    ],
  },
  {
    title: 'Lead Cloud Platform Engineer',
    org: 'Cardless',
    place: 'Remote',
    dates: 'Aug 2022 – Jan 2023',
    start: '2022-08',
    end: '2023-01',
    highlights: [
      'Codified 100% of production AWS infrastructure in Terraform, and wrote and drove adoption of the company’s first infrastructure roadmap.',
      'Moved production Kubernetes to a new VPC at 99.9% uptime for critical services, and cut deployment times by 50% by consolidating DevOps tools into one CI/CD platform.',
    ],
  },
  {
    title: 'Cloud Engineer',
    org: 'Veda',
    place: 'Remote',
    dates: 'Jan 2021 – Aug 2022',
    start: '2021-01',
    end: '2022-08',
    highlights: [
      'Led the company-wide migration from GitHub to GitLab, with shared CI/CD pipelines on an autoscaling EC2 runner platform.',
      'Built cloud-native applications in Python and TypeScript on AWS CDK and Terraform, and brought Datadog observability to AWS infrastructure and workloads.',
    ],
  },
  {
    title: 'Software Engineer',
    org: 'Northwestern Mutual',
    place: 'Milwaukee, WI',
    dates: 'Jun 2018 – Jan 2021',
    start: '2018-06',
    end: '2021-01',
    highlights: [
      'Designed and maintained a shared GitLab CI/CD platform for 3,000+ engineers, standardizing security, testing and deployment.',
      'An early contributor to the company’s adoption of AWS CDK, and built the Python and Redshift data collection leadership used to measure DORA metrics.',
    ],
  },
]

// What he built, newest first, each led by its numbers: the homepage tells
// his career by these, and its numbers are the ones round the Vitruvian Man.
// In his voice, from the bullets above; nothing here that they don't say
export type Work = {
  id: string
  title: string
  role: string
  org: string
  dates: string
  impact: Impact[]
  summary: string
  detail: string
  stack: string[]
}

export const WORK: Work[] = [
  {
    id: 'migration',
    title: 'Moving GoFundMe Pro to pro.gofundme.com',
    role: 'Technical lead',
    org: 'GoFundMe',
    dates: 'Nov 2025 – Mar 2026',
    impact: [
      { value: '27', label: 'repositories moved to pro.gofundme.com, under millions of daily transactions' },
      { value: '4', label: 'product areas I led through the move' },
    ],
    summary:
      'A senior staff engineer brought me on as the platform’s subject-matter expert, and I led four of its product areas through the move from classy.org: Campaign Studio and the rendering engine for new campaigns, the live events platform, the Pro Services backend that call centers use on behalf of enterprise nonprofits, and the developer documentation site.',
    detail:
      'A dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda let us roll out behind flags and roll back fast. The move touched 27 repositories under millions of daily transactions, and the design proved out when a rollback restored service for an enterprise customer’s weekend live event, without compromising the migration timeline.',
    stack: ['Cloudflare', 'CloudFront', 'Route53', 'ECS', 'Lambda'],
  },
  {
    id: 'receipts',
    title: 'Annual summary receipts, redesigned',
    role: 'Lead engineer',
    org: 'GoFundMe',
    dates: '2025',
    impact: [{ value: '~2M', label: 'annual receipts each January, with no incidents in 2026' }],
    summary:
      'About 2 million annual summary receipts go out each January, and they came from a Lambda workload that timed out and retried. I redesigned them as an ECS Fargate task on the primary API, and won buy-in from the architecture decision makers.',
    detail:
      'The new design made possible what wasn’t before: receipts on demand, requested by donors or sent by nonprofit admins on their behalf, and year-to-date summaries. The January 2026 run had no issues or incidents.',
    stack: ['ECS Fargate', 'AWS'],
  },
  {
    id: 'actions',
    title: 'GitHub Actions for GoFundMe Pro',
    role: 'Cloud and platform',
    org: 'GoFundMe',
    dates: '2023 – 2024',
    impact: [{ value: '8', label: 'engineering teams moved onto shared GitHub Actions' }],
    summary:
      'I built the reusable GitHub Actions workflows and self-hosted runners that moved GoFundMe Pro off Bitbucket and AWS CodePipeline, across 8 engineering teams.',
    detail:
      'I also led moving a sharded MongoDB cluster from self-managed EC2 to MongoDB Atlas with zero customer-facing downtime, and the Kong API platform from EC2 to ECS, and mentored engineers through GoFundMe’s mentorship program.',
    stack: ['GitHub Actions', 'MongoDB Atlas', 'Kong', 'ECS'],
  },
  {
    id: 'cardless',
    title: 'Cardless’s cloud, in code',
    role: 'Lead Cloud Platform Engineer',
    org: 'Cardless',
    dates: '2022 – 2023',
    impact: [
      { value: '100%', label: 'of production AWS infrastructure codified in Terraform' },
      { value: '99.9%', label: 'uptime moving production Kubernetes to a new VPC' },
      { value: '50%', label: 'shorter deployment times, on one CI/CD platform' },
    ],
    summary:
      'I codified all of Cardless’s production AWS infrastructure in Terraform, and wrote, and drove adoption of, the company’s first infrastructure roadmap.',
    detail:
      'I moved production Kubernetes to a new VPC at 99.9% uptime for critical services, and cut deployment times in half by consolidating DevOps tools into one CI/CD platform.',
    stack: ['Terraform', 'Kubernetes', 'AWS'],
  },
  {
    id: 'gitlab',
    title: 'CI/CD for 3,000+ engineers',
    role: 'Software Engineer',
    org: 'Northwestern Mutual',
    dates: '2018 – 2021',
    impact: [{ value: '3,000+', label: 'engineers on the GitLab CI/CD platform I designed' }],
    summary:
      'I designed and maintained the shared GitLab CI/CD platform that 3,000+ engineers shipped through, standardizing security, testing and deployment.',
    detail:
      'I was an early contributor to the company’s adoption of AWS CDK, and built the Python and Redshift data collection leadership used to measure DORA metrics.',
    stack: ['GitLab CI/CD', 'AWS CDK', 'Python', 'Redshift'],
  },
]

export const CERTIFICATIONS = [
  {
    id: 'jacket',
    name: 'AWS Golden Jacket',
    issuer: 'Amazon Web Services',
    date: 'Dec 2023',
    month: '2023-12',
    note: 'Every AWS certification, the last of them earned in December 2023. The gold jacket is how AWS marks it.',
    href: CREDLY,
    // For the numbers round the Vitruvian Man, who's wearing it. Twelve, though
    // Credly shows 13 badges: Solutions Architect – Associate is there twice, from
    // 2018 and its 2023 renewal
    impact: [{ value: '12', label: 'AWS certifications, all of them, for the Golden Jacket he’s wearing' }],
  },
]

export const EDUCATION = [
  {
    school: 'Milwaukee School of Engineering',
    degree: 'B.S. Software Engineering',
    place: 'Milwaukee, WI',
    dates: '2014 – 2018',
    start: '2014-01',
    end: '2018-01',
  },
]

export const SKILLS = [
  { group: 'Languages & frameworks', items: ['TypeScript', 'Next.js', 'React', 'PHP (Laravel)', 'Python', 'JavaScript', 'Bash'] },
  { group: 'Data', items: ['MySQL', 'PostgreSQL', 'MongoDB Atlas', 'MongoDB', 'Amazon Redshift'] },
  {
    group: 'Cloud & infrastructure',
    items: ['AWS', 'Terraform', 'AWS CDK', 'CloudFormation', 'Kubernetes', 'Docker', 'ECS', 'EKS', 'EC2', 'Lambda', 'CloudFront', 'Route53', 'IAM', 'VPC', 'RDS', 'DynamoDB', 'S3'],
  },
  { group: 'Delivery & tooling', items: ['GitHub Actions', 'GitLab CI/CD', 'Bitbucket', 'Infrastructure as Code', 'OpenTelemetry', 'Kong API Gateway', 'Claude'] },
]

// The numbers round the Vitruvian Man, told as his career in two chapters, the
// way his intro tells it: six years building the platform software ships on,
// then shipping product on top of it, as two strengths rather than a move from
// one to the other. Each is a number from a project in WORK, or the Golden
// Jacket's in CERTIFICATIONS, by its id and value, oldest first, so the story
// runs left to right and down each side
export const CHAPTERS: { title: string; when: string; numbers: [string, string][] }[] = [
  {
    title: 'Platform: making software ship',
    when: '2018 – 2024',
    numbers: [['gitlab', '3,000+'], ['cardless', '100%'], ['cardless', '50%'], ['jacket', '12']],
  },
  {
    title: 'Product: shipping on the platform',
    when: '2025 – 2026',
    numbers: [['receipts', '~2M'], ['migration', '27'], ['migration', '4']],
  },
]
