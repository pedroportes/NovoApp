import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Context to manage Dialog state
const DialogContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => { } })

const Dialog: React.FC<{
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}> = ({ children, open, onOpenChange }) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = open !== undefined

    const ctxOpen = isControlled ? open : internalOpen
    const ctxOnOpenChange = isControlled ? onOpenChange : setInternalOpen

    return (
        <DialogContext.Provider value={{ open: !!ctxOpen, onOpenChange: ctxOnOpenChange || (() => { }) }}>
            {children}
        </DialogContext.Provider>
    )
}

const DialogTrigger: React.FC<{
    asChild?: boolean
    children: React.ReactElement
}> = ({ asChild, children }) => {
    const { onOpenChange } = React.useContext(DialogContext)

    return React.cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
            children.props.onClick?.(e)
            onOpenChange(true)
        }
    })
}

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // In a full implementation, this uses ReactDOM.createPortal
    // For simplicity/robustness without extra deps, we render inline but with fixed positioning
    return <>{children}</>
}

const DialogOverlay = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DialogContext)
    if (!open) return null

    return (
        <div
            ref={ref}
            className={cn(
                "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className
            )}
            onClick={() => onOpenChange(false)}
            {...props}
        />
    )
})
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(DialogContext)
    if (!open) return null

    return (
        <DialogPortal>
            <DialogOverlay />
            <div
                ref={ref}
                className={cn(
                    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                    className
                )}
                {...props}
            >
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </DialogPortal>
    )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}

// Stub for DialogClose if needed, though X button handles it usually
const DialogClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <button ref={ref} className={className} {...props} />
))
DialogClose.displayName = "DialogClose"
