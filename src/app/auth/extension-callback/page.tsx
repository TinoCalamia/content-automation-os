'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'connecting' | 'connected' | 'error';

export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<Status>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const extensionId = params.get('extensionId');

    if (!extensionId) {
      setErrorMessage(
        'Missing extension ID. Please try connecting again from the extension.'
      );
      setStatus('error');
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setErrorMessage('No active session found. Please log in first.');
        setStatus('error');
        return;
      }

      // Send session to the Chrome extension via externally_connectable messaging
      const chromeGlobal = globalThis as unknown as {
        chrome?: {
          runtime?: {
            sendMessage: (
              id: string,
              msg: unknown,
              cb: (r: unknown) => void
            ) => void;
          };
        };
      };

      const chromeRuntime = chromeGlobal.chrome?.runtime;

      if (chromeRuntime?.sendMessage) {
        chromeRuntime.sendMessage(
          extensionId,
          {
            type: 'AUTH_SESSION',
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
            },
          },
          (response: unknown) => {
            const res = response as { success?: boolean } | undefined;
            if (res?.success) {
              setStatus('connected');
              // Auto-close the tab after 2 seconds
              setTimeout(() => window.close(), 2000);
            } else {
              setErrorMessage(
                'Could not connect to the extension. Make sure it is installed and try again.'
              );
              setStatus('error');
            }
          }
        );
      } else {
        setErrorMessage(
          'Chrome extension API not available. Make sure the Content Hub Saver extension is installed.'
        );
        setStatus('error');
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {status === 'connecting' && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <svg
                className="h-6 w-6 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">Connecting Extension...</h1>
            <p className="text-muted-foreground">
              Please wait while we connect your account.
            </p>
          </>
        )}

        {status === 'connected' && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-green-700 dark:text-green-400">
              Connected!
            </h1>
            <p className="text-muted-foreground">
              Your extension is now connected. This tab will close automatically.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-red-700 dark:text-red-400">
              Connection Failed
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}
