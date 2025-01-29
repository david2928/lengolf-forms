import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format, isSameDay, parseISO } from "date-fns"
import { useEffect, useState } from "react"
import { Loader2, Clock, Calendar } from "lucide-react"

interface UsageHistoryEntry {
  used_date: string
  used_hours: number
  employee_name: string
  created_at: string
}

interface UsageHistoryDialogProps {
  packageId: string
  isOpen: boolean
  onClose: () => void
}

export function UsageHistoryDialog({ packageId, isOpen, onClose }: UsageHistoryDialogProps) {
  const [history, setHistory] = useState<UsageHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsageHistory() {
      if (!isOpen) return
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/packages/${packageId}/usage-history`)
        if (!response.ok) throw new Error('Failed to fetch usage history')
        const data = await response.json()
        setHistory(data)
      } catch (err) {
        setError('Failed to load usage history')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsageHistory()
  }, [packageId, isOpen])

  // Group entries by date
  const groupedHistory = history.reduce((groups, entry) => {
    const date = format(parseISO(entry.used_date), 'MMMM d, yyyy')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as Record<string, UsageHistoryEntry[]>)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader className="border-b pb-2 mb-4">
          <DialogTitle>Package Usage History</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div 
                key={date}
                className="border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {date}
                  </span>
                </div>
                
                <div className="space-y-3 pl-6">
                  {entries.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">
                          {entry.used_hours} {entry.used_hours === 1 ? 'hour' : 'hours'} used
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {entry.employee_name} at {format(new Date(entry.created_at), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No usage history found
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}