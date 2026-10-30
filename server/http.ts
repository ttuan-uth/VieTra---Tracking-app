import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown

export function wrap(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function invalidInput(res: Response, error: ZodError): void {
  res.status(400).json({
    error: {
      code: 'INVALID_INPUT',
      message: 'Dữ liệu gửi lên không hợp lệ.',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  })
}

export function notFound(res: Response, message = 'Không tìm thấy dữ liệu.'): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message } })
}
