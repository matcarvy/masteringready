'use client'

import React, { useEffect, useRef } from 'react'

// Inject keyframes once via a module-level flag
let shimmerInjected = false

function useShimmerStyle() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!shimmerInjected && typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = '@keyframes mr-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }'
      document.head.appendChild(style)
      shimmerInjected = true
    }
  }, [])
}

const shimmerBase: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--mr-bg-hover) 25%, var(--mr-bg-elevated) 50%, var(--mr-bg-hover) 75%)',
  backgroundSize: '200% 100%',
  animation: 'mr-shimmer 1.5s ease-in-out infinite',
}

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  style?: React.CSSProperties
}

export function SkeletonBox({ width, height, borderRadius = '0.5rem', style }: SkeletonProps) {
  useShimmerStyle()
  return (
    <div style={{ ...shimmerBase, width, height, borderRadius, ...style }} />
  )
}

export function SkeletonText({ width = '100%', style }: { width?: string | number; style?: React.CSSProperties }) {
  useShimmerStyle()
  return (
    <div style={{ ...shimmerBase, width, height: '1rem', borderRadius: '0.25rem', ...style }} />
  )
}

export function SkeletonCircle({ size = 48, style }: { size?: number; style?: React.CSSProperties }) {
  useShimmerStyle()
  return (
    <div style={{ ...shimmerBase, width: size, height: size, borderRadius: '50%', ...style }} />
  )
}
