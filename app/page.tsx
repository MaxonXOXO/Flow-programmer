'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SplashScreen from '@/components/editor/SplashScreen'
import { useSettingsStore } from '@/store/useSettingsStore'

export default function WelcomePage() {
  const router = useRouter()
  const { settings, initSettings } = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    initSettings()
    setMounted(true)
  }, [initSettings])

  useEffect(() => {
    if (mounted && settings.general.startupWorkspace === 'editor') {
      const savedProject = localStorage.getItem('fp_project')
      if (!savedProject) {
        // Create default empty project for direct editor launch
        const defaultProject = {
          id: 'default_project',
          name: 'Untitled Flow Project',
          board: 'arduino_uno',
          updatedAt: Date.now(),
        }
        localStorage.setItem('fp_project', JSON.stringify(defaultProject))
      }
      router.push('/editor')
    }
  }, [mounted, settings.general.startupWorkspace, router])

  if (!mounted) return null
  if (settings.general.startupWorkspace === 'editor') return null

  return <SplashScreen />
}