import { redirect } from 'next/navigation'

// Who he is and how to reach him are the homepage's last stop now
export default function AboutPage() {
  redirect('/#contact')
}
