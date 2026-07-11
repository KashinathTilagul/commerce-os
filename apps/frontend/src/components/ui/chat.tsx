import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const MessageScroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[80px] max-h-[340px] scroll-smooth", className)}
    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
    {...props}
  />
))
MessageScroller.displayName = "MessageScroller"

export const Message = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { isKrishna?: boolean }>(({ className, isKrishna, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 6, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.03 }}
    className={cn("flex items-end gap-2", isKrishna ? "justify-start" : "justify-end", className)}
  />
))
Message.displayName = "Message"

export const Bubble = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { isKrishna?: boolean, prevSameRole?: boolean, nextSameRole?: boolean }>(({ className, isKrishna, prevSameRole, nextSameRole, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "max-w-[78%] px-3 py-2 text-[12px] leading-relaxed",
        isKrishna 
          ? `rounded-2xl rounded-bl-sm text-white/85 border ${!prevSameRole ? 'rounded-tl-2xl' : 'rounded-tl-sm'} ${!nextSameRole ? 'rounded-bl-sm' : 'rounded-bl-2xl'}` 
          : `rounded-2xl rounded-br-sm text-white/90 ${!prevSameRole ? 'rounded-tr-2xl' : 'rounded-tr-sm'} ${!nextSameRole ? 'rounded-br-sm' : 'rounded-br-2xl'}`,
        className
      )}
      style={isKrishna ? {
        background: 'rgba(88,86,214,0.15)',
        borderColor: 'rgba(88,86,214,0.2)',
      } : {
        background: 'rgba(255,255,255,0.1)',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
      {...props}
    />
  )
})
Bubble.displayName = "Bubble"
