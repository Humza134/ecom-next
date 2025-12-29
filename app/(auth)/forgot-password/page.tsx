'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// 1. Define Schema
const ForgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

// 2. Infer the type from Zod (No need for manual interface)
type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

interface ClerkError {
  errors?: Array<{ longMessage: string }>;
  message: string;
}

export default function ForgotPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  // 3. Initialize form using the Shadcn/Zod pattern
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // 4. Update onSubmit to use the inferred type
  const onSubmit = async (data: ForgotPasswordValues) => {
    if (!isLoaded) return;
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: data.email,
      });

      setSent(true);
    } catch (err: unknown) {
      const clerkError = err as ClerkError;
      setError(clerkError.errors?.[0]?.longMessage || clerkError.message);
    }
  };

  if (sent) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We’ve sent a reset code to your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Didn’t get the email? Check your spam folder.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => router.push('/forgot-password/reset')} className="w-full">
              Enter Code & Reset
            </Button>
            <Button
              variant="link"
              onClick={() => router.push('/sign-in')}
            >
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email and we’ll send you a reset code.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* 5. Wrap with the Form component */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 6. Use FormField instead of manual Input/Label */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2 pt-4">
                <Button type="submit" className="w-full">
                  Send Reset Code
                </Button>

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => router.push('/sign-in')}
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}