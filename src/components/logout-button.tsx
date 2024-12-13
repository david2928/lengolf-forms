'use client'

import { signOut } from 'next-auth/react'
import { Button } from './ui/button'

export function LogoutButton() {
  return (
    <div className="absolute top-2 right-4 z-10">
      <Button
        variant="outline"
        onClick={() => signOut()}
        className="text-sm px-3 bg-white hover:bg-gray-50"
      >
        Sign Out
      </Button>
    </div>
  )
}