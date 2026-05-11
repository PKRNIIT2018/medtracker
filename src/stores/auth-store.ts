import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  pinEnabled: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setPin: (enabled: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  pinEnabled: false,
  isLoading: true,
  setUser: (user) => set({ user }),
  setPin: (enabled) => set({ pinEnabled: enabled }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
