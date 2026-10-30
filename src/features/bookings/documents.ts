import type { DemoDocument } from '../../types/domain'

export interface DocumentSlot {
  id: string
  label: string
  hint: string
  required: boolean
}

export interface DocumentState {
  required: number
  verified: number
  pending: number
  missing: DocumentSlot[]
  needsFix: DemoDocument[]
  ready: boolean
}

interface SlotInput {
  mode: 'ocean' | 'air' | 'rail'
  specialTypes: string[]
  cargoInsurance: boolean
}

const TRANSPORT_SLOT: Record<
  SlotInput['mode'],
  { id: string; label: string; hint: string }
> = {
  ocean: {
    id: 'transport',
    label: 'Vận đơn đường biển (B/L)',
    hint: 'Bản nháp B/L hoặc booking confirmation của hãng tàu.',
  },
  air: {
    id: 'transport',
    label: 'Vận đơn hàng không (AWB)',
    hint: 'AWB hoặc xác nhận chỗ của hãng bay.',
  },
  rail: {
    id: 'transport',
    label: 'Vận đơn đường sắt (CIM/SMGS)',
    hint: 'Chứng từ vận tải đường sắt hoặc xác nhận booking.',
  },
}

export function requiredDocumentSlots(input: SlotInput): DocumentSlot[] {
  const slots: DocumentSlot[] = [
    {
      id: 'invoice',
      label: 'Hóa đơn thương mại',
      hint: 'Commercial invoice có chữ ký hoặc đóng dấu của người bán.',
      required: true,
    },
    {
      id: 'packing',
      label: 'Packing list',
      hint: 'Danh sách kiện, trọng lượng và thể tích từng dòng hàng.',
      required: true,
    },
    {
      ...TRANSPORT_SLOT[input.mode],
      required: true,
    },
  ]

  if (input.specialTypes.includes('dangerous')) {
    slots.push(
      {
        id: 'msds',
        label: 'MSDS pin lithium',
        hint: 'Bản MSDS đầy đủ cho hàng nguy hiểm nhóm 9.',
        required: true,
      },
      {
        id: 'dg-declaration',
        label: 'Khai báo hàng nguy hiểm',
        hint: 'Bản khai IMDG/IATA ký bởi người gửi.',
        required: true,
      },
    )
  }

  if (input.cargoInsurance) {
    slots.push({
      id: 'insurance',
      label: 'Chứng nhận bảo hiểm hàng hóa',
      hint: 'Giấy chứng nhận bảo hiểm theo giá trị đã khai báo.',
      required: true,
    })
  }

  return slots
}

export function documentForSlot(
  documents: DemoDocument[],
  slotId: string,
): DemoDocument | undefined {
  return documents.find((document) => document.slotId === slotId)
}

export function documentState(
  documents: DemoDocument[],
  slots: DocumentSlot[],
): DocumentState {
  const requiredSlots = slots.filter((slot) => slot.required)
  const files = requiredSlots
    .map((slot) => documentForSlot(documents, slot.id))
    .filter((document): document is DemoDocument => Boolean(document))

  const missing = requiredSlots.filter((slot) => !documentForSlot(documents, slot.id))
  const needsFix = files.filter((document) => document.status === 'needs-fix')
  const verified = files.filter((document) => document.status === 'verified').length
  const pending = files.filter((document) => document.status === 'pending').length

  return {
    required: requiredSlots.length,
    verified,
    pending,
    missing,
    needsFix,
    ready:
      requiredSlots.length > 0 &&
      missing.length === 0 &&
      needsFix.length === 0 &&
      verified === requiredSlots.length,
  }
}
