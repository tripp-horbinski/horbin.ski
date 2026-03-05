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
        I&apos;m a dog dad to 2{' '}
        <a
          href="https://puppe.rs"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          puppers
        </a>
        .
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
        You can view my{' '}
        <a
          href="https://github.com/tripp-horbinski"
          target="_blank"
          rel="noopener noreferrer"
          className="link"
        >
          AI slop
        </a>
        {' '}or connect with me on{' '}
        <a
          href="https://www.linkedin.com/in/tripp-horbinski/"
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
