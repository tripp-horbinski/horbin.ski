import { redirect } from 'next/navigation'

// The resume is on the Career page now, with the timeline over it
export default function ResumePage() {
  redirect('/career/')
}
