'use client';

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
    >
      Sign Out
    </Button>
  );
}