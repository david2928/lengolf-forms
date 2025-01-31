import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Diamond, Clock, Package2 } from 'lucide-react';
import { usePackageMonitor } from '@/hooks/use-package-monitor';

export function PackageMonitorNavButton() {
  const { data } = usePackageMonitor();
  
  if (!data) return null;

  return (
    <Button variant="ghost" asChild className="gap-2">
      <Link href="/package-monitor">
        <Package2 className="h-4 w-4" />
      </Link>
    </Button>
  );
}