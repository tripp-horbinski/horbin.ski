// Tripp's career: the one source for the Career page, its timeline and its PDF.
// From his resume; the roles' `highlights` are its bullets as written, and
// `impact` pulls the numbers out of them to lead each role on the page.

import { CREDLY, EMAIL, GITHUB, LINKEDIN } from '@/lib/site'

export type Role = {
  title: string
  org: string
  place: string
  // As printed, e.g. "Apr 2023 – Oct 2026", and as months for the timeline
  dates: string
  start: string
  end: string
  highlights: string[]
  impact: { value: string; label: string }[]
}

export const PROFILE = {
  name: 'Tripp Horbinski',
  headline: 'Platform Engineer',
  location: 'Milwaukee, Wisconsin',
  summary:
    'Platform Engineer with 8 years of experience building cloud-native platforms, developer infrastructure, and distributed systems. Proven track record modernizing production systems, leading acquisition integrations, and delivering zero-downtime migrations at scale. AWS Certified Golden Jacket recipient with expertise in cloud architecture, Infrastructure as Code, CI/CD platforms, and developer tooling.',
  contact: [
    { label: 'Email', href: `mailto:${EMAIL}`, text: EMAIL },
    { label: 'LinkedIn', href: LINKEDIN, text: 'in/tripp-horbinski' },
    { label: 'GitHub', href: GITHUB, text: 'tripp-horbinski' },
    { label: 'Web', href: 'https://tripp.horbin.ski/', text: 'tripp.horbin.ski' },
  ],
}

// Newest first, the way a resume reads; the journey walks them oldest first
export const ROLES: Role[] = [
  {
    title: 'Senior Software Engineer',
    org: 'GoFundMe',
    place: 'Remote',
    dates: 'Apr 2023 – Oct 2026',
    start: '2023-04',
    end: '2026-10',
    highlights: [
      'Served as a technical lead for the rebranding and domain consolidation of the acquired Classy platform under the GoFundMe Pro brand, coordinating changes across 27 services and delivering a zero-downtime migration from classy.org to pro.gofundme.com supporting millions of daily transactions without customer impact.',
      'Designed and implemented a dual-domain serving strategy using Cloudflare, CloudFront, Route53, ECS, and Lambda, enabling feature-flag-driven rollouts, gradual traffic migration, and safe rollback paths throughout the transition.',
      'Established deployment and infrastructure standards for customer-facing applications, introducing Infrastructure as Code and rollout patterns adopted across engineering teams to support future platform modernization efforts.',
      'Developed reusable GitHub Actions workflows and self-hosted runner infrastructure that enabled GoFundMe Pro repositories to migrate from Bitbucket to GitHub, eliminating AWS CodePipeline, standardizing CI/CD workflows, and simplifying software delivery across 8 engineering teams.',
      'Led migration of a mission-critical sharded MongoDB cluster powering GoFundMe Pro donation experiences from self-managed EC2 infrastructure to MongoDB Atlas, improving reliability, scalability, and operational efficiency.',
      'Modernized the company’s Kong API platform by migrating from EC2 to ECS and implementing infrastructure-driven configuration management, improving reliability while reducing operational burden.',
      'Led re-architecture of GoFundMe Pro’s annual donor receipts platform, designing a scalable AWS-based architecture capable of reliably processing high-volume annual communications while reducing operational complexity and improving maintainability.',
      'Mentored engineers through GoFundMe’s mentorship program, providing guidance on cloud architecture, platform engineering, and software development practices.',
    ],
    impact: [
      { value: '27', label: 'services in a zero-downtime domain migration' },
      { value: 'Millions', label: 'of daily transactions, no customer impact' },
      { value: '8', label: 'engineering teams onto shared GitHub Actions' },
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
      'Codified 100% of production AWS infrastructure using Terraform, establishing a scalable Infrastructure-as-Code foundation that improved deployment reliability, operational consistency, and auditability.',
      'Authored and drove adoption of the company’s first Infrastructure Roadmap, aligning leadership and engineering teams around strategic platform investments and long-term cloud architecture priorities.',
      'Led migration of production Kubernetes infrastructure to a new VPC, executing a phased strategy that maintained 99.9% uptime for critical services throughout the transition.',
      'Consolidated multiple DevOps tools into a unified CI/CD platform, reducing deployment times by 50% while simplifying software delivery workflows across engineering teams.',
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
      'Designed and built cloud-native applications using Python and TypeScript, leveraging AWS CDK and Terraform to create reusable infrastructure and deployment patterns.',
      'Led the company-wide migration from GitHub to GitLab SaaS, architecting shared CI/CD pipelines and an autoscaling EC2 runner platform that improved build efficiency and developer experience.',
      'Implemented Datadog observability across AWS infrastructure and application workloads, providing actionable visibility into production performance and operational health.',
      'Mentored engineers on cloud architecture, infrastructure, and software engineering best practices through recurring office hours and internal technical publications.',
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
      'Designed and maintained a shared GitLab CI/CD platform supporting 3,000+ engineers, standardizing security, testing, and deployment workflows while accelerating adoption through zero-touch change management and improved release velocity.',
      'Developed Python-based data collection systems and Amazon Redshift integrations that enabled engineering leadership to measure DORA metrics and improve software delivery performance.',
      'Served as an early contributor to enterprise adoption of AWS CDK, helping define reusable infrastructure constructs, documentation standards, and CI/CD integration patterns used across multiple engineering teams.',
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
  {
    group: 'Cloud & Infrastructure',
    items: ['AWS', 'Terraform', 'AWS CDK', 'CloudFormation', 'Kubernetes', 'Docker', 'ECS', 'EKS', 'EC2', 'Lambda', 'CloudFront', 'Route53', 'IAM', 'VPC', 'RDS', 'DynamoDB', 'S3'],
  },
  {
    group: 'Platform Engineering',
    items: ['GitHub Actions', 'GitLab CI/CD', 'Bitbucket', 'Infrastructure as Code', 'Platform Architecture', 'Developer Tooling', 'OpenTelemetry', 'Kong API Gateway'],
  },
  { group: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'Bash', 'PHP'] },
  { group: 'Data & Storage', items: ['PostgreSQL', 'MongoDB Atlas', 'MongoDB', 'Amazon Redshift'] },
]
