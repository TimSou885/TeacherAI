import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { hasSupabaseEnv } from './lib/supabase'
import { getStudentSession } from './lib/api'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import TeacherLayout from './pages/teacher/TeacherLayout'
import Dashboard from './pages/teacher/Dashboard'
import Students from './pages/teacher/Students'
import Content from './pages/teacher/Content'
import Generate from './pages/teacher/Generate'
import Quiz from './pages/teacher/Quiz'
import StrokeTeach from './pages/teacher/StrokeTeach'
import ErrorReview from './pages/teacher/ErrorReview'
import Live from './pages/teacher/Live'
import Chat from './pages/student/Chat'
import StudentLogin from './pages/student/StudentLogin'
import StudentHome, {
  StudentChatTab,
  StudentPracticeTab,
  StudentWritingTab,
  StudentMeTab,
} from './pages/student/StudentHome'
import Join from './pages/student/Join'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCostMonitor from './pages/admin/CostMonitor'
import AdminConversations from './pages/admin/Conversations'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">載入中…</div>
  if (!user) return <Navigate to="/teacher/login" replace />
  return <>{children}</>
}

function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getStudentSession()
  if (!session) return <Navigate to="/student" replace />
  return <>{children}</>
}

export default function App() {
  if (!hasSupabaseEnv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <div className="max-w-md text-center text-amber-900">
          <p className="font-medium">環境變數未設定</p>
          <p className="mt-2 text-sm text-amber-700">
            請在 Cloudflare Pages 的 Environment variables 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY，然後重新部署。
          </p>
        </div>
      </div>
    )
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Navigate to="/teacher/login" replace />} />
        <Route path="/teacher/login" element={<Login />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="/generate" element={<Navigate to="/teacher/generate" replace />} />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="content" element={<Content />} />
          <Route path="generate" element={<Generate />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="stroke-teach" element={<StrokeTeach />} />
          <Route path="error-review" element={<ErrorReview />} />
          <Route path="live" element={<Live />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="cost" element={<AdminCostMonitor />} />
          <Route path="conversations" element={<AdminConversations />} />
        </Route>
        <Route path="/student" element={<StudentLogin />} />
        <Route path="/student/join" element={<StudentProtectedRoute><Join /></StudentProtectedRoute>} />
        <Route path="/student/home" element={<StudentProtectedRoute><StudentHome /></StudentProtectedRoute>}>
          <Route index element={<Navigate to="/student/home/chat" replace />} />
          <Route path="chat" element={<StudentChatTab />} />
          <Route path="practice" element={<StudentPracticeTab />} />
          <Route path="writing" element={<StudentWritingTab />} />
          <Route path="me" element={<StudentMeTab />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
