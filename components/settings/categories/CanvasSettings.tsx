'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsDropdown from '../controls/SettingsDropdown'
import SettingsSlider from '../controls/SettingsSlider'
import SettingsNumberInput from '../controls/SettingsNumberInput'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { Grid, Compass, MousePointer, Spline, Activity, RotateCcw } from 'lucide-react'

export default function CanvasSettings() {
  const { settings, updateSetting, resetCategory, isModified } = useSettingsStore()
  const cv = settings.canvas

  return (
    <div>
      <SettingsSection
        title="Canvas Grid & Alignment"
        description="Configure background grid, snapping rules, and density."
      >
        <SettingsToggle
          title="Show Background Grid"
          description="Display grid lines or dot matrix pattern behind nodes."
          icon={<Grid className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('canvas', 'showGrid')}
          checked={cv.showGrid}
          onChange={(checked) => updateSetting('canvas', 'showGrid', checked)}
        />

        <SettingsToggle
          title="Snap to Grid"
          description="Align nodes automatically to grid intersections when dragging."
          icon={<Compass className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('canvas', 'snapToGrid')}
          checked={cv.snapToGrid}
          onChange={(checked) => updateSetting('canvas', 'snapToGrid', checked)}
        />

        <SettingsNumberInput
          title="Grid Density"
          description="Distance in pixels between grid line intersections."
          icon={<Grid className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('canvas', 'gridDensity')}
          value={cv.gridDensity}
          min={10}
          max={50}
          step={5}
          unit="px"
          onChange={(val) => updateSetting('canvas', 'gridDensity', val)}
        />
      </SettingsSection>

      <SettingsSection title="Interaction & Navigation Controls">
        <SettingsSlider
          title="Zoom Sensitivity"
          description="Wheel mouse zoom scaling speed."
          icon={<MousePointer className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('canvas', 'zoomSensitivity')}
          value={cv.zoomSensitivity}
          min={0.2}
          max={2.5}
          step={0.1}
          unit="x"
          onChange={(val) => updateSetting('canvas', 'zoomSensitivity', val)}
        />

        <SettingsSlider
          title="Pan Speed"
          description="Drag speed when panning across the canvas plane."
          icon={<MousePointer className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('canvas', 'panSpeed')}
          value={cv.panSpeed}
          min={0.5}
          max={3.0}
          step={0.1}
          unit="x"
          onChange={(val) => updateSetting('canvas', 'panSpeed', val)}
        />

        <SettingsToggle
          title="Smooth Zoom Transitions"
          description="Enable inertia smoothing when zooming in and out."
          isModified={isModified('canvas', 'smoothZoom')}
          checked={cv.smoothZoom}
          onChange={(checked) => updateSetting('canvas', 'smoothZoom', checked)}
        />

        <SettingsToggle
          title="Smooth Node Entrance Animations"
          description="Animate subtle fade-in when placing new nodes on the canvas."
          isModified={isModified('canvas', 'smoothNodeAnimation')}
          checked={cv.smoothNodeAnimation}
          onChange={(checked) => updateSetting('canvas', 'smoothNodeAnimation', checked)}
        />
      </SettingsSection>

      <SettingsSection title="Wire Connection Visuals">
        <SettingsDropdown
          title="Wire Routing Edge Style"
          description="Curvature geometry for wire paths connecting node ports."
          icon={<Spline className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('canvas', 'edgeStyle')}
          value={cv.edgeStyle}
          options={[
            { value: 'bezier', label: 'Curved Bezier (Default)' },
            { value: 'smoothstep', label: 'Orthogonal Smoothstep' },
            { value: 'straight', label: 'Direct Straight Line' },
          ]}
          onChange={(val) => updateSetting('canvas', 'edgeStyle', val as any)}
        />

        <SettingsToggle
          title="Live Connection Wire Preview"
          description="Draw live wire path when dragging from a port."
          icon={<Activity className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('canvas', 'connectionPreview')}
          checked={cv.connectionPreview}
          onChange={(checked) => updateSetting('canvas', 'connectionPreview', checked)}
        />

        <SettingsButton
          title="Reset Canvas Category"
          description="Restore default values for all preferences in this category."
          icon={<RotateCcw className="w-4 h-4 text-[#ff5f9e]" />}
          buttonText="Restore Canvas Defaults"
          variant="secondary"
          onClick={() => resetCategory('canvas')}
        />
      </SettingsSection>
    </div>
  )
}
