import { useTeacherClass } from '../../contexts/TeacherClassContext'

export default function StrokeTeach() {
  const { classes } = useTeacherClass()

  if (classes.length === 0) {
    return (
      <div className="rounded-xl bg-amber-100/80 border border-amber-200 p-6 text-center text-amber-800">
        尚無班級。
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-amber-900">筆順教學投影</h1>
      <p className="text-sm text-amber-700">
        課堂投影筆順示範，供全班一起觀看。學生端可在「寫字」分頁進行筆順練習。
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 text-center text-amber-800">
        <p className="font-medium mb-2">預留：筆順動畫投影</p>
        <p className="text-sm">
          可在此嵌入筆順元件或連結至學生端寫字頁，大畫面顯示單字筆順，方便教師講解。
        </p>
      </div>
    </div>
  )
}
