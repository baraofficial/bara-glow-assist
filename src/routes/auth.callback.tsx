import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleLogin = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) console.log('Error:', error)
      navigate({ to: '/' }) // kalau sukses balik ke home
    }
    handleLogin()
  }, [navigate])

  return <div>Loading login...</div>
      }
