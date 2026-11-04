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
  // A startup's stage while he was there and what it does, for a recruiter who
  // doesn't know the name; a company they'd know goes without
  stage?: string
  place: string
  // As printed, e.g. "Apr 2023 – Oct 2026", and as months for the timeline
  dates: string
  start: string
  end: string
  highlights: string[]
  // Newest first, in place of the role's own highlights
  phases?: Phase[]
}

const LOOKING_FOR = 'Senior roles, platform or full stack'
const BASED_IN = 'Milwaukee, open to remote, Boulder or San Francisco'

export const PROFILE = {
  name: 'Tripp Horbinski',
  headline: 'Senior Software Engineer',
  location: 'Milwaukee, Wisconsin (open to remote, Boulder or San Francisco)',
  // His line under his name, first on the page: the title he's held, which a
  // recruiter knows at a glance, and short, so the meadow keeps the screen.
  // His range is for his intro and his numbers to show
  tagline: 'Senior Software Engineer',
  // What he's looking for and where he's based (the meadow is in Colorado, he
  // isn't), set apart on the About sign and a sentence in getting in touch. Both
  // lanes on purpose: his tailored resumes do the steering, application by application
  lookingFor: LOOKING_FOR,
  basedIn: BASED_IN,
  openTo: `Looking for ${LOOKING_FOR}. Based in ${BASED_IN}.`,
  // Leading his selected work
  practice:
    'Selected projects from eight years of engineering, newest first.',
  // The About sign, in his voice: the one thing to take away, then how he got there
  thesis: 'I run and I build things.',
  intro: [
    '8 years building software: 6 on CI/CD and cloud, and 2 full stack',
    'Pre-AI: all 12 AWS certifications, on call everywhere, Stack Overflow scholar',
    'Now I build with AI agents',
  ],
  // The stack he works in, for whoever's scanning for it, languages first: what
  // he's deepest in, not everything he's touched
  worksIn: 'TypeScript, Next.js, Python, AWS, IaC, Docker',
  // The resume's
  summary:
    'Senior software engineer with 8 years of experience across platform and product. Six years in cloud and DevOps, owning how software ships from commit to production, then nearly two building GoFundMe Pro full stack, on that platform, in TypeScript, Next.js and AWS. On call at every company. AWS Golden Jacket recipient.',
  contact: [
    { label: 'Email', href: `mailto:${EMAIL}`, text: EMAIL },
    { label: 'LinkedIn', href: LINKEDIN, text: 'in/tripp-horbinski' },
    { label: 'GitHub', href: GITHUB, text: 'github.com/tripp-horbinski' },
    { label: 'Web', href: 'https://tripp.horbin.ski/', text: 'https://tripp.horbin.ski' },
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
          'Technical lead for four product areas in migrating GoFundMe Pro from classy.org to pro.gofundme.com (Nov 2025 – Mar 2026), brought on by a senior staff engineer as the platform’s subject-matter expert: Campaign Studio and the rendering engine for new campaigns, the live events platform, GoFundMe Pro Services, which call centers use on behalf of enterprise nonprofits, and the developer documentation site. The migration touched 27 repositories, under millions of daily transactions, and used a dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda for flag-driven rollout and fast rollback, which proved out when a rollback restored service for an enterprise customer’s weekend live event without compromising the migration timeline.',
          'Led the redesign of the annual summary receipts, about 2 million generated each January: migrated them from a Lambda workload that timed out and retried into an ECS Fargate task on the primary API, won buy-in from the architecture decision makers, and added what wasn’t possible before: receipts on demand, requested by donors or sent by nonprofit admins on their behalf, and year-to-date summaries. The January 2026 run had no issues or incidents.',
          'Cut CI pipeline time from 17 to 10 minutes (about 41%) through dependency upgrades, a pnpm migration and selective test execution, and added ephemeral preview environments for AI-agent and developer iteration.',
          'As the only engineer on the project (Jul – Oct 2026), ported Pro Services, the 8-year-old application enterprise nonprofits and their call centers use to take donations by phone, from Create React App to Next.js in the front-end monolith and onto the new design system: 26 screens, with rewritten unit and Playwright tests, ready to release behind feature flags and a cookie toggle.',
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
          'Set up the central GitHub Actions repository, two workflow templates built from shared jobs and steps, and the self-hosted runners that migrated GoFundMe Pro off Bitbucket and AWS CodePipeline, used by about 40 repositories across 8 engineering teams.',
          'On call for the July 2024 AWS Kinesis outage in us-east-1: CloudWatch Logs failures kept new ECS tasks from starting during a scaling event and left only the old, overloaded tasks logging. We traced the cause, restored service by disabling CloudWatch logging, and added a logging check at container startup.',
          'Addressed flaky tests that kept recurring across PR and release pipelines, many of them tied to timestamps or live network requests.',
          'Led the migration of the sharded MongoDB cluster behind donation campaign pages and email templates from self-managed EC2 to MongoDB Atlas with zero customer-facing downtime, and of the Kong API platform from EC2 to ECS.',
          'Mentored engineers through GoFundMe’s mentorship program.',
        ],
      },
    ],
  },
  {
    title: 'Lead Cloud Platform Engineer',
    org: 'Cardless',
    stage: 'Series B fintech',
    place: 'Remote',
    dates: 'Aug 2022 – Jan 2023',
    start: '2022-08',
    end: '2023-01',
    highlights: [
      'Codified 100% of production AWS infrastructure in Terraform, and wrote and drove adoption of the company’s first infrastructure roadmap.',
      'Migrated production Kubernetes to a new VPC at 99.9% uptime for critical services, and cut deployment times by 50% by consolidating DevOps tools into one CI/CD platform.',
    ],
  },
  {
    title: 'Cloud Engineer',
    org: 'Veda',
    stage: 'Series A to B healthcare data startup',
    place: 'Remote',
    dates: 'Jan 2021 – Aug 2022',
    start: '2021-01',
    end: '2022-08',
    highlights: [
      'Led the company-wide migration from GitHub to GitLab, with shared CI/CD pipelines on an autoscaling EC2 runner platform.',
      'Built 12 reusable AWS CDK constructs and Terraform modules for cloud-native applications in Python and TypeScript, and brought Datadog observability to AWS infrastructure and workloads.',
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
      'Developed and maintained reusable GitLab CI templates for 3,000+ engineers, standardizing security, testing and deployment.',
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
  // Its story in the same short steps, read at a glance, in place of the summary and detail
  story?: { job: string; did: string; result: string }
  summary: string
  detail?: string
  stack: string[]
}

export const WORK: Work[] = [
  {
    id: 'payments',
    title: 'The call-center donation app, modernized',
    role: 'Only engineer on the project',
    org: 'GoFundMe',
    dates: 'Jul – Oct 2026',
    impact: [
      { value: '8', label: 'year-old enterprise payment application ported and modernized onto Next.js' },
      { value: '26', label: 'screens ported, as the only engineer on the project' },
    ],
    story: {
      job: 'Pro Services is how enterprise nonprofits and their call centers take donations over the phone and handle back-end tasks. Two company initiatives, one front-end monolith and a new design system, needed it migrated off Create React App and its custom components.',
      did: 'I ported its 26 screens and their logic to Next.js in the monolith and onto the design system, rewrote its unit and Playwright tests, and used the existing end-to-end tests for regression.',
      result: 'It was ready to release in October 2026, behind feature flags, with a cookie to switch between the old and new apps.',
    },
    summary: 'I ported the 8-year-old application call centers use to take donations by phone to Next.js and our new design system.',
    stack: ['Next.js', 'React', 'Playwright'],
  },
  {
    id: 'migration',
    title: 'Migrating GoFundMe Pro to pro.gofundme.com',
    role: 'Technical lead',
    org: 'GoFundMe',
    dates: 'Nov 2025 – Mar 2026',
    impact: [
      { value: '27', label: 'repos covering 4 product surfaces in the migration to pro.gofundme.com, under millions of daily transactions' },
    ],
    story: {
      job: 'Migrate GoFundMe Pro from classy.org to pro.gofundme.com, across 27 repositories, under millions of daily transactions.',
      did: 'A senior staff engineer brought me on as the platform’s subject-matter expert. I led the migration effort of 4 product surfaces to safely roll out dual-domain support behind feature flags.',
      result: 'The release was successful. We did have to use the feature flag gate for our live events platform, where it restored service for an enterprise customer’s weekend event.',
    },
    summary:
      'A senior staff engineer brought me on as the platform’s subject-matter expert, and I led four of its product areas through the migration from classy.org: Campaign Studio and the rendering engine for new campaigns, the live events platform, GoFundMe Pro Services, which call centers use on behalf of enterprise nonprofits, and the developer documentation site.',
    detail:
      'A dual-domain setup on Cloudflare, CloudFront, Route53, ECS and Lambda let us roll out behind flags and roll back fast. The migration touched 27 repositories under millions of daily transactions, and the design proved out when a rollback restored service for an enterprise customer’s weekend live event, without compromising the migration timeline.',
    stack: ['Cloudflare', 'CloudFront', 'Route53', 'ECS', 'Lambda'],
  },
  {
    id: 'receipts',
    title: 'Annual summary receipts, redesigned',
    role: 'Lead engineer',
    org: 'GoFundMe',
    dates: '2025',
    impact: [{ value: '~2M', label: 'annual receipts each January, with no incidents in 2026' }],
    story: {
      job: 'About 2 million annual summary receipts go out each January, and they came from a Lambda workload that timed out and retried.',
      did: 'I redesigned them as an ECS Fargate task on the primary API, and won buy-in from the architecture decision makers.',
      result: 'The January 2026 run had no issues or incidents. Donors can now request receipts on demand, nonprofit admins can send them on donors’ behalf, and there are year-to-date summaries.',
    },
    summary:
      'About 2 million annual summary receipts go out each January, and they came from a Lambda workload that timed out and retried. I redesigned them as an ECS Fargate task on the primary API, and won buy-in from the architecture decision makers.',
    detail:
      'The new design made possible what wasn’t before: receipts on demand, requested by donors or sent by nonprofit admins on their behalf, and year-to-date summaries. The January 2026 run had no issues or incidents.',
    stack: ['ECS Fargate', 'AWS'],
  },
  {
    id: 'atlas',
    title: 'The database behind donation pages',
    role: 'Cloud and platform',
    org: 'GoFundMe',
    dates: '2023 – 2024',
    impact: [{ value: '0', label: 'customer-facing downtime migrating our donation pages’ database to Atlas' }],
    summary:
      'I led migrating the sharded MongoDB cluster behind our donation campaign pages and email templates from self-managed EC2 to MongoDB Atlas, with zero customer-facing downtime.',
    detail: 'I also led migrating the Kong API platform from EC2 to ECS.',
    stack: ['MongoDB Atlas', 'Kong', 'ECS'],
  },
  {
    id: 'actions',
    title: 'GitHub Actions for GoFundMe Pro',
    role: 'Cloud and platform',
    org: 'GoFundMe',
    dates: '2023 – 2024',
    impact: [{ value: '8', label: 'engineering teams migrated onto shared GitHub Actions' }],
    summary:
      'I set up the central GitHub Actions repository, two workflow templates built from shared jobs and steps, and the self-hosted runners that migrated GoFundMe Pro off Bitbucket and AWS CodePipeline, used by about 40 repositories across 8 engineering teams.',
    detail: 'It gave each repository its own settings for deployment and manual gates.',
    stack: ['GitHub Actions', 'Self-hosted runners'],
  },
  {
    id: 'cardless',
    title: 'Cardless’s deployments, cut in half',
    role: 'Lead Cloud Platform Engineer',
    org: 'Cardless',
    dates: '2022 – 2023',
    impact: [
      { value: '50%', label: 'shorter deployment times, on one CI/CD platform' },
      { value: '100%', label: 'of production AWS infrastructure codified in Terraform' },
      { value: '99.9%', label: 'uptime migrating production Kubernetes to a new VPC' },
    ],
    summary:
      'I cut deployment times in half by consolidating DevOps tools into one CI/CD platform, and wrote, and drove adoption of, the company’s first infrastructure roadmap.',
    detail:
      'I codified all of Cardless’s production AWS infrastructure in Terraform, and migrated production Kubernetes to a new VPC at 99.9% uptime for critical services.',
    stack: ['Terraform', 'Kubernetes', 'AWS'],
  },
  {
    id: 'veda',
    title: 'Reusable infrastructure as code',
    role: 'Cloud Engineer',
    org: 'Veda',
    dates: '2021 – 2022',
    impact: [{ value: '12', label: 'reusable AWS CDK constructs and Terraform modules I built' }],
    summary:
      'I built 12 reusable AWS CDK constructs and Terraform modules for cloud-native applications in Python and TypeScript.',
    detail:
      'I also led the company-wide migration from GitHub to GitLab, with shared CI/CD pipelines on an autoscaling EC2 runner platform, and brought Datadog observability to our AWS infrastructure and workloads.',
    stack: ['AWS CDK', 'Terraform', 'Python', 'TypeScript', 'Datadog', 'GitLab CI/CD'],
  },
  {
    id: 'gitlab',
    title: 'CI/CD for 3,000+ engineers',
    role: 'Software Engineer',
    org: 'Northwestern Mutual',
    dates: '2018 – 2021',
    impact: [{ value: '3,000+', label: 'engineers using the reusable GitLab CI templates I developed' }],
    summary:
      'I developed and maintained the reusable GitLab CI templates that 3,000+ engineers shipped through, standardizing security, testing and deployment.',
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
    note: 'All 12 AWS certifications, the last of them earned in December 2023. The gold jacket is how AWS marks it.',
    href: CREDLY,
    // For the numbers on the walk. Twelve, though
    // Credly shows 13 badges: Solutions Architect – Associate is there twice, from
    // 2018 and its 2023 renewal
    impact: [{ value: '12', label: 'AWS certifications, all of them, which earned me the Golden Jacket' }],
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
export const CHAPTERS: { label: string; title: string; oneCompany?: boolean; numbers: [string, string][] }[] = [
  {
    label: 'Platform',
    title: 'CI/CD and cloud infrastructure',
    numbers: [['gitlab', '3,000+'], ['veda', '12'], ['cardless', '50%'], ['atlas', '0']],
  },
  {
    label: 'Product',
    title: 'Shipping on the GoFundMe Pro platform',
    // Its title names the company, so its numbers don't
    oneCompany: true,
    numbers: [['receipts', '~2M'], ['migration', '27'], ['payments', '8']],
  },
]
