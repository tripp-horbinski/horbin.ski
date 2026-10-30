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
  headline: 'Software Engineer',
  location: 'Milwaukee, Wisconsin',
  // His line under his name, first on the page, like an old shop's sign
  tagline: 'Purveyor of fine software',
  // How he builds now, leading his selected work, in his voice
  practice:
    'I build beautiful, useful software that people use every day, and these days I build it with Claude Code across the whole lifecycle: PRDs and documentation, ramping up in new repositories and their patterns, scoping work, keeping QA visible against the definition of done, and finding the improvements that matter most.',
  // The homepage's summary, in his voice
  intro:
    'I’m a software engineer. I spent six years in cloud and DevOps learning how software ships, from commit to production, at Northwestern Mutual, Veda, Cardless and GoFundMe. In 2025 I moved to building the product itself, full stack. I want to keep delivering products people use every day.',
  // The resume's
  summary:
    'Software engineer with 8 years of experience. Six years in cloud and DevOps, owning how software ships from commit to production; since 2025, a full-stack engineer building GoFundMe Pro in TypeScript, Next.js, Laravel and AWS. AWS Certified Golden Jacket recipient.',
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
          'Technical lead for four product areas in moving GoFundMe Pro from classy.org to pro.gofundme.com (Nov 2025 – Mar 2026), brought on by a senior staff engineer as the platform’s subject-matter expert: Campaign Studio and the rendering engine for new campaigns, the live events platform, the Pro Services backend that call centers use on behalf of enterprise nonprofits, and the developer documentation site. The move touched 27 repositories and used a dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda for flag-driven rollout and safe rollback; it shipped with zero downtime for enterprise organizations, under millions of daily transactions.',
          'Led the redesign of the annual summary receipts, about 2 million generated each January: moved them from a Lambda workload that timed out and retried into an ECS Fargate task on the primary API, won buy-in from the architecture decision makers, and added what wasn’t possible before: receipts on demand, requested by donors or sent by nonprofit admins on their behalf, and year-to-date summaries. The January 2026 run had no issues or incidents.',
          'Built reporting, data and onboarding features in the admin nonprofit administrators use to run their fundraising.',
          'On Post-Donate, worked on everything a donor sees after giving: the thank-you page, transactional emails, and the start of share attribution.',
          'Used Claude across the development lifecycle: PRDs and documentation, ramping up in new repositories and their patterns, scoping work, keeping QA visible against the definition of done, and finding high-impact improvements.',
        ],
      },
      {
        label: 'Cloud and platform',
        dates: 'Apr 2023 – Dec 2024',
        start: '2023-04',
        end: '2024-12',
        highlights: [
          'Built reusable GitHub Actions workflows and self-hosted runners that moved GoFundMe Pro off Bitbucket and AWS CodePipeline, across 8 engineering teams.',
          'Led the migration of a sharded MongoDB cluster from self-managed EC2 to MongoDB Atlas, and of the Kong API platform from EC2 to ECS.',
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
      { value: '27', label: 'repositories moved to pro.gofundme.com, with zero downtime' },
      { value: '4', label: 'product areas I led through the move' },
    ],
    summary:
      'A senior staff engineer brought me on as the platform’s subject-matter expert, and I led four of its product areas through the move from classy.org: Campaign Studio and the rendering engine for new campaigns, the live events platform, the Pro Services backend that call centers use on behalf of enterprise nonprofits, and the developer documentation site.',
    detail:
      'A dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda let us roll out behind flags and roll back safely. The move touched 27 repositories and shipped with zero downtime for enterprise organizations, under millions of daily transactions.',
    stack: ['Cloudflare', 'CloudFront', 'Route53', 'ECS', 'Lambda'],
  },
  {
    id: 'receipts',
    title: 'Annual summary receipts, redesigned',
    role: 'Lead engineer',
    org: 'GoFundMe',
    dates: '2025',
    impact: [{ value: '2M', label: 'or so annual receipts each January, with no incidents in 2026' }],
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
      'I also led moving a sharded MongoDB cluster from self-managed EC2 to MongoDB Atlas, and the Kong API platform from EC2 to ECS, and mentored engineers through GoFundMe’s mentorship program.',
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
    note: 'Every AWS certification, the last of them earned December 30, 2023. The gold jacket is how AWS marks it.',
    href: CREDLY,
    // For the numbers round the Vitruvian Man, who's wearing it
    impact: [{ value: '13', label: 'AWS certifications, all of them, for the Golden Jacket he’s wearing' }],
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
// way his intro tells it: six years making software ship, then building the
// product. Each is a number from a project in WORK, or the Golden Jacket's in
// CERTIFICATIONS, by its id and value, oldest first, so the story runs left to
// right and down each side
export const CHAPTERS: { title: string; when: string; numbers: [string, string][] }[] = [
  {
    title: 'First, making software ship',
    when: '2018 – 2024',
    numbers: [['gitlab', '3,000+'], ['cardless', '100%'], ['cardless', '50%'], ['jacket', '13']],
  },
  {
    title: 'Now, building what people use',
    when: '2025 – 2026',
    numbers: [['receipts', '2M'], ['migration', '27'], ['migration', '4']],
  },
]
