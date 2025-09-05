"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | 'success' | 'error'>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Here you would typically update the user's profile via an API call
      // For now, we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      // Clear success/error message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }
  return (
    <div>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Settings</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Profile">
            <form onSubmit={handleSave} className="space-y-3 text-sm">
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="opacity-70">Name</label>
                <div className="col-span-2">
                  <input
                    className="w-full h-9 rounded-md border border-black/10 dark:border-white/10 bg-background px-3 text-sm"
                    value={user?.fullName || ''}
                    disabled
                  />
                  <p className="text-xs text-foreground/50 mt-1">
                    Update your name in your account settings
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="opacity-70">Email</label>
                <div className="col-span-2">
                  <input
                    className="w-full h-9 rounded-md border border-black/10 dark:border-white/10 bg-background px-3 text-sm"
                    value={user?.primaryEmailAddress?.emailAddress || ''}
                    disabled
                  />
                  <p className="text-xs text-foreground/50 mt-1">
                    Update your email in your account settings
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <label className="opacity-70">Plan</label>
                <div className="col-span-2">
                  <select 
                    className="w-full h-9 rounded-md border border-black/10 dark:border-white/10 bg-background px-2 text-sm"
                    disabled
                  >
                    <option>Free</option>
                    <option disabled>Pro (Coming Soon)</option>
                  </select>
                  <p className="text-xs text-foreground/50 mt-1">
                    Free plan includes basic features
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                {saveStatus === 'success' && (
                  <span className="text-sm text-green-500">Profile updated successfully!</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-sm text-red-500">Error updating profile. Please try again.</span>
                )}
                <div className="ml-auto">
                  <button 
                    type="submit" 
                    className="h-9 px-3 rounded-lg bg-foreground text-background text-sm disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          <Card title="Usage">
            <div className="space-y-3">
              <div className="space-y-2 text-sm">
                <p>Plan: <span className="font-medium">Free</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-[var(--accent)] h-2.5 rounded-full" 
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="text-xs text-foreground/60">
                  Upgrade to Pro for more features
                </p>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">What&apos;s included:</h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center">
                    <svg className="w-3.5 h-3.5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic document storage
                  </li>
                  <li className="flex items-center">
                    <svg className="w-3.5 h-3.5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI-powered search
                  </li>
                  <li className="flex items-center text-foreground/50">
                    <svg className="w-3.5 h-3.5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Priority support (Pro)
                  </li>
                  <li className="flex items-center text-foreground/50">
                    <svg className="w-3.5 h-3.5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Faster processing (Pro)
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
