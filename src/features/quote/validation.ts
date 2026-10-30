import { z } from 'zod'
import type { QuoteDraft } from '../../types/domain'

const addressSchema = z.object({
  countryCode: z.string().min(2, 'Chọn quốc gia'),
  search: z.string().min(3, 'Nhập ít nhất 3 ký tự để tìm địa chỉ'),
  street: z.string().min(3, 'Nhập địa chỉ cụ thể'),
  postalCode: z.string().min(3, 'Nhập mã bưu chính'),
  city: z.string().min(2, 'Nhập thành phố'),
})

const lineSchema = z.object({
  quantity: z.number().min(1, 'Số kiện tối thiểu là 1'),
  weightKg: z.number().positive('Trọng lượng phải lớn hơn 0'),
  lengthCm: z.number().positive('Chiều dài phải lớn hơn 0'),
  widthCm: z.number().positive('Chiều rộng phải lớn hơn 0'),
  heightCm: z.number().positive('Chiều cao phải lớn hơn 0'),
})

const quoteSchema = z.object({
  pickup: addressSchema,
  delivery: addressSchema,
  lines: z.array(lineSchema).min(1, 'Cần ít nhất một dòng hàng'),
  contactName: z.string().min(2, 'Nhập họ tên người liên hệ'),
  email: z.string().email('Email chưa đúng định dạng'),
  phone: z.string().min(6, 'Nhập số điện thoại'),
  companyName: z.string(),
  customerType: z.enum(['business', 'individual']),
  termsAccepted: z.boolean(),
})

export function quoteErrors(quote: QuoteDraft): Record<string, string> {
  const result = quoteSchema.safeParse(quote)
  const output: Record<string, string> = {}

  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!output[path]) output[path] = issue.message
    }
  }

  if (quote.customerType === 'business' && quote.companyName.trim().length < 2) {
    output.companyName = 'Nhập tên công ty'
  }
  if (!quote.termsAccepted) output.terms = 'Cần đồng ý điều khoản trước khi gửi.'
  if (quote.handling === 'special' && quote.specialTypes.length === 0) {
    output.specialTypes = 'Chọn ít nhất một loại hàng hoá đặc biệt.'
  }

  return output
}

export const contactSchema = z.object({
  customerType: z.enum(['business', 'individual']),
  companyName: z.string(),
  fullName: z.string().min(2, 'Nhập họ và tên'),
  email: z.string().email('Email chưa đúng định dạng'),
  phone: z.string().min(6, 'Nhập số điện thoại'),
  termsAccepted: z.boolean(),
})

export function contactErrors(contact: z.infer<typeof contactSchema>): Record<string, string> {
  const result = contactSchema.safeParse(contact)
  const output: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (!output[path]) output[path] = issue.message
    }
  }
  if (contact.customerType === 'business' && contact.companyName.trim().length < 2) {
    output.companyName = 'Nhập tên công ty'
  }
  if (!contact.termsAccepted) output.termsAccepted = 'Cần đồng ý điều khoản để tiếp tục.'
  return output
}
