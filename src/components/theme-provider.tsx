import { createContext, useContext, useEffect, useState } from "react"

export type Theme = "enterprise" | "bento" | "dark-ops" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement

        // Clean up
        root.classList.remove("light", "dark")
        root.removeAttribute("data-theme")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark-ops"
                : "enterprise"

            // Map system preference to our themes
            const resolvedTheme = systemTheme === "dark-ops" ? "dark-ops" : "enterprise"

            root.setAttribute("data-theme", resolvedTheme)

            if (resolvedTheme === "dark-ops") {
                root.classList.add("dark")
            }
            return
        }

        root.setAttribute("data-theme", theme)

        // For Tailwind 'class' mode compatibility (dark variants)
        if (theme === "dark-ops") {
            root.classList.add("dark")
        }
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}

