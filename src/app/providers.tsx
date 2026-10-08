'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function Providers({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light')

    useEffect(() => {
        let storedTheme: string | null = null
        try {
            storedTheme = localStorage.getItem('qr-theme')
        } catch {
            // Theme controls still work when browser storage is unavailable.
        }
        if (storedTheme === 'light' || storedTheme === 'dark') {
            setThemeState(storedTheme)
            document.documentElement.classList.toggle(
                'dark',
                storedTheme === 'dark'
            )
            return
        }

        document.documentElement.classList.remove('dark')
    }, [])

    const setTheme = useCallback((nextTheme: Theme) => {
        setThemeState(nextTheme)
        document.documentElement.classList.toggle('dark', nextTheme === 'dark')
        try {
            localStorage.setItem('qr-theme', nextTheme)
        } catch {
            // Persistence is optional; applying the selected theme is not.
        }
    }, [])

    const value = useMemo(
        () => ({
            theme,
            setTheme,
        }),
        [theme, setTheme]
    )

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within Providers')
    }

    return context
}
