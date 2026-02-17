import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SubscriptionInfo {
  isInGracePeriod: boolean
  isRestricted: boolean
  gracePeriodEnd: Date | null
  status: string
  daysRemaining: number | null
}

export function useSubscription(): SubscriptionInfo {
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    (supabase.rpc as any)('get_subscription_info').then(({ data, error }: any) => {
      if (!error && data) setInfo(data)
    })
  }, [])

  const gracePeriodEnd = info?.grace_period_end ? new Date(info.grace_period_end) : null
  let daysRemaining: number | null = null

  if (gracePeriodEnd) {
    const diff = gracePeriodEnd.getTime() - Date.now()
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return {
    isInGracePeriod: info?.is_in_grace_period ?? false,
    isRestricted: info?.is_restricted ?? false,
    gracePeriodEnd,
    status: info?.subscription_status ?? 'active',
    daysRemaining,
  }
}
