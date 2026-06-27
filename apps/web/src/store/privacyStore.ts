import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PrivacyStore = {
  isPrivate: boolean
  togglePrivacy: () => void
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      isPrivate: true,
      togglePrivacy: () => set((state) => ({ isPrivate: !state.isPrivate })),
    }),
    { name: 'privacy-mode' },
  ),
)
