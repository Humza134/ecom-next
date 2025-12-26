'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';


// Define a schema for the email verification form
const verificationSchema = z.object({
  code: z.string().min(6, 'Verification code must be 6 digits'),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

export default function VerifyEmailPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (data: VerificationFormValues) => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: data.code,
      });

      if (completeSignUp.status === 'complete') {
        // Set the session active to log the user in
        await setActive({ session: completeSignUp.createdSessionId });

        // Redirect to dashboard or home page
        router.push('/');
      } else {
        // If the status is not complete, handle other statuses as needed
        console.log('Sign up status:', completeSignUp);
      }
    } catch (err) {
      const error = err as Error & {
        errors?: Array<{ code: string; message: string }>
      };

      console.error('Verification error:', error);
      setError(error.errors?.[0]?.message || error.message || 'An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;

    setIsSending(true);
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code'
      });
      // Show success message to user
    } catch (err) {
      const error = err as Error & {
        errors?: Array<{ code: string; message: string }>
      };

      console.error('Resend error:', error);
      setError(error.errors?.[0]?.message || error.message || 'Failed to resend verification code');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container flex h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            We've sent a verification code to your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter 6-digit code" maxLength={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleResendCode}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? 'Sending...' : 'Resend Verification Code'}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Didn't receive the email? Check your spam folder.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}