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

        // --- PWA Theme Color Update ---
        const metaThemeColor = document.querySelector("meta[name='theme-color']")
        if (metaThemeColor) {
            let color = "#ffffff" // default

            // Resolve color based on theme
            const activeTheme = theme === 'system'
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark-ops' : 'enterprise')
                : theme

            switch (activeTheme) {
                case 'dark-ops': color = '#0f172a'; break; // Slate 900
                case 'midnight': color = '#020617'; break; // Slate 950
                case 'bento': color = '#F5F5F7'; break;
                case 'amethyst': color = '#faf5ff'; break; // Purple 50
                case 'enterprise':
                default:
                    color = '#f8fafc'; // Slate 50
                    break;
            }
            metaThemeColor.setAttribute("content", color)
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

