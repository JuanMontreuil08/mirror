'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    await supabase.from('users').insert({ id: data.user.id, email })
    await supabase.from('portfolios').insert({ user_id: data.user.id, name: 'My portfolio' })
    await supabase.from('notification_preferences').insert({ user_id: data.user.id })
  }

  if (!data.session) {
    redirect('/login?info=Check%20your%20email%20to%20confirm%20your%20account')
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
