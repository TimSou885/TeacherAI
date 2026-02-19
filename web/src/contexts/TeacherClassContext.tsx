import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type ClassItem = { id: string; name: string; join_code: string }

type TeacherClassContextValue = {
  classes: ClassItem[]
  classId: string
  setClassId: (id: string) => void
  setClasses: (list: ClassItem[]) => void
  refreshClasses: () => Promise<void>
}

const TeacherClassContext = createContext<TeacherClassContextValue | null>(null)

export function TeacherClassProvider({
  children,
  fetchClasses,
}: {
  children: ReactNode
  fetchClasses: () => Promise<ClassItem[]>
}) {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [classId, setClassId] = useState('')

  const refreshClasses = useCallback(async () => {
    const list = await fetchClasses()
    setClasses(list)
    if (list.length > 0) {
      setClassId((id) => (id && list.some((c) => c.id === id) ? id : list[0]!.id))
    }
  }, [])

  const setClassIdSafe = useCallback(
    (id: string) => {
      setClassId(id)
      if (classes.length > 0 && !classes.some((c) => c.id === id)) {
        // keep current if new list doesn't have it
      }
    },
    [classes]
  )

  useEffect(() => {
    refreshClasses()
  }, [refreshClasses])

  return (
    <TeacherClassContext.Provider
      value={{
        classes,
        classId,
        setClassId: setClassIdSafe,
        setClasses,
        refreshClasses,
      }}
    >
      {children}
    </TeacherClassContext.Provider>
  )
}

export function useTeacherClass() {
  const ctx = useContext(TeacherClassContext)
  if (!ctx) throw new Error('useTeacherClass must be used within TeacherClassProvider')
  return ctx
}
