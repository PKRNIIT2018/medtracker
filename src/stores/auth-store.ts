import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  pinEnabled: boolean
  pinHash: string | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setPin: (enabled: boolean, hash: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  pinEnabled: false,
  pinHash: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setPin: (enabled, hash) => set({ pinEnabled: enabled, pinHash: hash }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
