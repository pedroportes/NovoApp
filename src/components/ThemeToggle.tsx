import { Moon, Sun, Laptop, Grid, Shield, Building2 } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <Select value={theme} onValueChange={(val: any) => setTheme(val)}>
            <SelectTrigger className="w-[180px] h-10 bg-background/50 backdrop-blur-sm border-border">
                <SelectValue placeholder="Selecione o tema" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="enterprise">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span>Enterprise</span>
                    </div>
                </SelectItem>
                <SelectItem value="bento">
                    <div className="flex items-center gap-2">
                        <Grid className="h-4 w-4 text-purple-500" />
                        <span>Bento Grid</span>
                    </div>
                </SelectItem>
                <SelectItem value="amethyst">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-violet-500 border border-slate-200" />
                        <span>Amethyst</span>
                    </div>
                </SelectItem>
                <SelectItem value="dark-ops">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-500" />
                        <span>Dark Ops</span>
                    </div>
                </SelectItem>
                <SelectItem value="midnight">
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-400" />
                        <span>Midnight</span>
                    </div>
                </SelectItem>
                <SelectItem value="system">
                    <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        <span>Sistema</span>
                    </div>
                </SelectItem>
            </SelectContent>
        </Select>
    )
}
