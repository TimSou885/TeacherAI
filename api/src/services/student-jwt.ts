import { SignJWT, jwtVerify } from 'jose'

const STUDENT_ISSUER = 'eduspark-student'
const STUDENT_AUDIENCE = 'eduspark-student'
const EXPIRY = '7d' // 7 天

export type StudentJwtPayload = {
  sub: string       // student_id
  role: 'student'
  class_id: string
  school_id?: string | null
  name: string
  grade_level: number
}

export async function signStudentJwt(
  secret: string,
  payload: StudentJwtPayload
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({
    role: payload.role,
    class_id: payload.class_id,
    school_id: payload.school_id ?? null,
    name: payload.name,
    grade_level: payload.grade_level,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(STUDENT_ISSUER)
    .setAudience(STUDENT_AUDIENCE)
    .setExpirationTime(EXPIRY)
    .setIssuedAt()
    .sign(key)
}

export async function verifyStudentJwt(
  secret: string,
  token: string
): Promise<StudentJwtPayload | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, {
      issuer: STUDENT_ISSUER,
      audience: STUDENT_AUDIENCE,
    })
    const sub = payload.sub
    if (!sub || typeof sub !== 'string') return null
    return {
      sub,
      role: 'student',
      class_id: payload.class_id as string,
      school_id: (payload.school_id as string | null) ?? null,
      name: (payload.name as string) ?? '',
      grade_level: Number(payload.grade_level) || 3,
    }
  } catch {
    return null
  }
}
