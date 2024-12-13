'use client';

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      console.log('Starting Google sign in...');
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: true
      });
      console.log('Sign in result:', result);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            LENGOLF Forms
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in with your authorized Google account
          </p>
        </div>
        <div className="mt-8">
          <Button
            className="w-full bg-[#4285F4] hover:bg-[#357ABD] text-white"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Sign in with Google'}
          </Button>
        </div>
      </div>
    </div>
  );
}