import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleLogin = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        console.log('Error:', error)
        navigate({ to: '/' }) // kalau error tetep balikin ke home
      } else {
        navigate({ to: '/' }) // kalau sukses
      }
    }
    handleLogin()
  }, [navigate])

  return <div>Loading login...</div>
        }
