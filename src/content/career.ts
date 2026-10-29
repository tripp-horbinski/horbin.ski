// Tripp's career: the one source for the homepage's walk and its print-only
// resume, and so the PDF. Written with him from his resume and an interview
// about his GoFundMe work: the detail goes to his recent years, and his
// earlier roles keep their best one or two lines. `impact` pulls the numbers
// out of the bullets to lead each role, or each phase of a role, on its card.

import { CREDLY, EMAIL, GITHUB, LINKEDIN } from '@/lib/site'

export type Impact = { value: string; label: string }

// A stretch of a role doing different work, told on its own
export type Phase = {
  label: string
  dates: string
  start: string
  end: string
  highlights: string[]
  impact: Impact[]
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
  impact: Impact[]
  // Newest first, in place of the role's own highlights and impact
  phases?: Phase[]
}

export const PROFILE = {
  name: 'Tripp Horbinski',
  headline: 'Software Engineer',
  location: 'Milwaukee, Wisconsin',
  // What he wants people to know first, in his own words
  tagline: 'I build beautiful, useful software that people use every day.',
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

// Newest first, the way a resume reads; the homepage walks them oldest first
export const ROLES: Role[] = [
  {
    title: 'Senior Software Engineer',
    org: 'GoFundMe',
    place: 'Remote',
    dates: 'Apr 2023 – Oct 2026',
    start: '2023-04',
    end: '2026-10',
    highlights: [],
    impact: [],
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
        impact: [
          { value: '27', label: 'repositories moved to pro.gofundme.com with zero downtime' },
          { value: '4', label: 'product areas led through the migration' },
          { value: '2M', label: 'or so annual receipts each January, no incidents' },
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
        impact: [{ value: '8', label: 'engineering teams onto shared GitHub Actions' }],
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
    impact: [
      { value: '100%', label: 'of production AWS infrastructure in Terraform' },
      { value: '99.9%', label: 'uptime through a Kubernetes VPC migration' },
      { value: '50%', label: 'shorter deployment times' },
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
    impact: [],
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
    impact: [{ value: '3,000+', label: 'engineers on the shared GitLab CI/CD platform' }],
  },
]

export const CERTIFICATIONS = [
  {
    name: 'AWS Golden Jacket',
    issuer: 'Amazon Web Services',
    date: 'Dec 2023',
    month: '2023-12',
    note: 'Every AWS certification, the last of them earned December 30, 2023. The gold jacket is how AWS marks it.',
    href: CREDLY,
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
