import { describe, expect, it } from 'vitest'
import {
  documentState,
  requiredDocumentSlots,
  type DocumentSlot,
} from './documents'
import type { DemoDocument, DocumentStatus } from '../../types/domain'

function doc(slotId: string, status: DocumentStatus): DemoDocument {
  return {
    id: `doc-${slotId}`,
    slotId,
    name: `${slotId}.pdf`,
    sizeBytes: 1024,
    status,
    uploadedAt: '2026-10-30T00:00:00.000Z',
    verifiedAt: status === 'verified' ? '2026-10-30T01:00:00.000Z' : undefined,
  }
}

const oceanSlots = (): DocumentSlot[] => [
  { id: 'invoice', label: 'Invoice', hint: '', required: true },
  { id: 'packing', label: 'Packing', hint: '', required: true },
  { id: 'transport', label: 'B/L', hint: '', required: true },
]

describe('document requirements', () => {
  it('requires invoice, packing list and B/L for a standard ocean shipment', () => {
    const slots = requiredDocumentSlots({
      mode: 'ocean',
      specialTypes: [],
      cargoInsurance: false,
    })
    expect(slots.map((slot) => slot.id)).toEqual(['invoice', 'packing', 'transport'])
  })

  it('uses the correct transport document per mode', () => {
    expect(
      requiredDocumentSlots({ mode: 'air', specialTypes: [], cargoInsurance: false }).find(
        (slot) => slot.id === 'transport',
      )?.label,
    ).toContain('AWB')
    expect(
      requiredDocumentSlots({ mode: 'rail', specialTypes: [], cargoInsurance: false }).find(
        (slot) => slot.id === 'transport',
      )?.label,
    ).toContain('CIM')
  })

  it('adds MSDS and DG declaration for dangerous cargo', () => {
    const slots = requiredDocumentSlots({
      mode: 'ocean',
      specialTypes: ['dangerous'],
      cargoInsurance: false,
    })
    expect(slots.map((slot) => slot.id)).toEqual([
      'invoice',
      'packing',
      'transport',
      'msds',
      'dg-declaration',
    ])
  })

  it('adds an insurance certificate when insurance is selected', () => {
    const slots = requiredDocumentSlots({
      mode: 'ocean',
      specialTypes: [],
      cargoInsurance: true,
    })
    expect(slots.map((slot) => slot.id)).toContain('insurance')
  })
})

describe('document state', () => {
  const slots = oceanSlots()

  it('is not ready when a file is missing', () => {
    const state = documentState([doc('invoice', 'verified'), doc('packing', 'verified')], slots)
    expect(state.ready).toBe(false)
    expect(state.missing.map((slot) => slot.id)).toEqual(['transport'])
    expect(state.verified).toBe(2)
  })

  it('is not ready while a file is pending verification', () => {
    const state = documentState(
      [doc('invoice', 'verified'), doc('packing', 'verified'), doc('transport', 'pending')],
      slots,
    )
    expect(state.ready).toBe(false)
    expect(state.pending).toBe(1)
    expect(state.verified).toBe(2)
  })

  it('is not ready when a file needs to be replaced', () => {
    const state = documentState(
      [doc('invoice', 'verified'), doc('packing', 'verified'), doc('transport', 'needs-fix')],
      slots,
    )
    expect(state.ready).toBe(false)
    expect(state.needsFix.map((item) => item.slotId)).toEqual(['transport'])
  })

  it('is ready when every required document is verified', () => {
    const state = documentState(
      [doc('invoice', 'verified'), doc('packing', 'verified'), doc('transport', 'verified')],
      slots,
    )
    expect(state.ready).toBe(true)
    expect(state.verified).toBe(3)
    expect(state.missing).toHaveLength(0)
    expect(state.needsFix).toHaveLength(0)
  })

  it('never marks a booking ready without required slots', () => {
    expect(documentState([], []).ready).toBe(false)
  })
})
