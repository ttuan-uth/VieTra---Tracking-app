import type { TransportMode } from '../../types/domain'

export const MODE_COLOR: Record<TransportMode, string> = {
  road: '#0c7c8a',
  ocean: '#1f5f8b',
  air: '#6d5ba6',
  rail: '#8a6332',
}

export const MODE_LABEL: Record<TransportMode, string> = {
  road: 'Đường bộ',
  ocean: 'Đường biển',
  air: 'Đường hàng không',
  rail: 'Đường sắt',
}

export const STATUS_COLOR = {
  normal: '#12603f',
  warning: '#b4761a',
  incident: '#a32217',
} as const
