import Link from 'next/link'

export const metadata = {
  title: 'Tripp Horbinski — Developer & Backpacker',
  description:
    'Developer at GoFundMe and backpacker. Writing about technology and hiking.',
}

export default function Home() {
  return (
    <div>
      <h1 className="text-xl md:text-2xl mb-1 font-medium">
        Tripp Horbinski
      </h1>
      <p className="my-5">
        I&apos;m a runner, backpacker, and dog dad.
      </p>
      <p className="my-5">
        I work at{' '}
        <a
          href="https://www.gofundme.com"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          GoFundMe
        </a>
        {' '}building the tools that connect people to the causes they care about.
      </p>
      <p className="my-5">
        You can read my{' '}
        <Link href="/writing" className="link">
          writing
        </Link>
        {' '}or{' '}
        <a
          href="https://github.com/tripp-horbinski"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          code
        </a>
        , or connect with me on{' '}
        <a
          href="https://linkedin.com/in/tripphorbinski"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          LinkedIn
        </a>
        .
      </p>
    </div>
  )
}
