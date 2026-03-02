'use client'

import { ExternalLink, FileText } from 'lucide-react'

const REPORTS = [
  { label: 'February 2026', file: 'lengolf-monthly-report-feb-2026.html' },
]

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Shareholder Reports</h1>
      <p className="text-sm text-muted-foreground mb-6">Monthly performance reports — click to open in a new tab.</p>

      <div className="flex flex-col gap-3">
        {REPORTS.map((r) => (
          <a
            key={r.file}
            href={`/reports/${r.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Monthly Report — {r.label}</div>
                <div className="text-xs text-muted-foreground">{r.file}</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        To add next month&apos;s report: copy the latest HTML file to <code className="bg-muted px-1 rounded">public/reports/</code> and add an entry to the <code className="bg-muted px-1 rounded">REPORTS</code> array in <code className="bg-muted px-1 rounded">app/admin/reports/page.tsx</code>.
      </p>
    </div>
  )
}
