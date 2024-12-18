import { type ITeacherPage } from '@mtucourses/rate-my-professors'

export type RMPInput = { profQuery: string }
export type RMPOutput = Partial<ITeacherPage> & { webUrl?: string, status: number}