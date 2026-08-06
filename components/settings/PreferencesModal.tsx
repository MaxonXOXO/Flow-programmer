'use client'

import React, { useEffect } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSearch from './controls/SettingsSearch'
import GeneralSettings from './categories/GeneralSettings'
import AppearanceSettings from './categories/AppearanceSettings'
import EditorSettings from './categories/EditorSettings'
import CanvasSettings from './categories/CanvasSettings'
import CompilerSettings from './categories/CompilerSettings'
import SimulationSettings from './categories/SimulationSettings'
import KeybindingsSettings from './categories/KeybindingsSettings'
import ExtensionsSettings from './categories/ExtensionsSettings'
import AboutSettings from './categories/AboutSettings'
import { 
  Monitor, Palette, Layout, Grid, Cpu, Play, Keyboard, Package, Info, X, Sliders
} from 'lucide-react'

const categories = [
  { id: 'general', label: 'General', icon: Monitor },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Layout },
  { id: 'canvas', label: 'Canvas', icon: Grid },
  { id: 'compiler', label: 'Compiler', icon: Cpu },
  { id: 'simulation', label: 'Simulation', icon: Play },
  { id: 'keybindings', label: 'Keybindings', icon: Keyboard },
  { id: 'extensions', label: 'Extensions', icon: Package },
  { id: 'about', label: 'About', icon: Info },
]

export default function PreferencesModal() {
  const { 
    isOpen, 
    closePreferences, 
    activeCategory, 
    setActiveCategory, 
    searchQuery, 
    setSearchQuery 
  } = useSettingsStore()

  // Close on Escape key press & register Ctrl+, global hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closePreferences()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closePreferences])

  if (!isOpen) return null

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'general': return <GeneralSettings />
      case 'appearance': return <AppearanceSettings />
      case 'editor': return <EditorSettings />
      case 'canvas': return <CanvasSettings />
      case 'compiler': return <CompilerSettings />
      case 'simulation': return <SimulationSettings />
      case 'keybindings': return <KeybindingsSettings />
      case 'extensions': return <ExtensionsSettings />
      case 'about': return <AboutSettings />
      default: return <GeneralSettings />
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(7, 9, 13, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={closePreferences}
    >
      {/* Modal Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 960,
          height: '85vh',
          maxHeight: 720,
          background: 'var(--color-bg-panel)',
          border: '1px solid #2a3550',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(95, 163, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'nodeFadeInOpacity 0.2s ease-out',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            height: 52,
            padding: '0 20px',
            background: 'var(--color-bg-header)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Sliders className="w-4 h-4 text-[#5fa3ff]" />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-bright)', letterSpacing: '0.5px' }}>
              PREFERENCES
            </span>
          </div>

          {/* Global Search Bar */}
          <div style={{ flex: 1, maxWidth: 440 }}>
            <SettingsSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          <button
            onClick={closePreferences}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ff5f9e'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Category Sidebar */}
          <div
            style={{
              width: 210,
              background: 'rgba(17, 20, 28, 0.6)',
              borderRight: '1px solid var(--color-border)',
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id && !searchQuery
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setSearchQuery('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: isActive ? 'rgba(95, 163, 255, 0.14)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--color-text-normal)',
                    fontSize: 11.5,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    position: 'relative',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.color = 'var(--color-text-bright)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--color-text-normal)'
                    }
                  }}
                >
                  {/* Left Active Selection Bar */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 6,
                        bottom: 6,
                        width: 3,
                        borderRadius: '0 3px 3px 0',
                        background: 'var(--color-accent-blue)',
                        boxShadow: '0 0 8px var(--color-accent-blue)',
                      }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5fa3ff]' : 'text-dim'}`} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* Right Content Area */}
          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              background: 'var(--color-bg-panel)',
            }}
          >
            {searchQuery ? (
              <div style={{ animation: 'nodeFadeInOpacity 0.18s ease-out' }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--color-accent-blue)',
                  marginBottom: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>Search Results for "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-dim)',
                      fontSize: 10,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear Search
                  </button>
                </div>

                <GeneralSettings />
                <AppearanceSettings />
                <EditorSettings />
                <CanvasSettings />
                <CompilerSettings />
                <SimulationSettings />
                <KeybindingsSettings />
                <ExtensionsSettings />
                <AboutSettings />
              </div>
            ) : (
              <div key={activeCategory} style={{ animation: 'nodeFadeInOpacity 0.18s ease-out' }}>
                {renderCategoryContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
