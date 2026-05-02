import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, getAuthToken } from '@/lib/auth'
import SiteListClient from '@/components/SiteListClient'

export default async function HomePage() {
  const cookieStore = await cookies()
  if (cookieStore.get(AUTH_COOKIE_NAME)?.value !== getAuthToken()) {
    redirect('/login')
  }
  return <SiteListClient />
}
