"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const payment_intent = searchParams.get("payment_intent");
    const status = searchParams.get("payment_intent_status");

    if (status === "succeeded" && payment_intent) {
      toast.success("Payment successful 🎉");
      setOrderId(payment_intent);
    } else {
      toast.error("Payment was not successful");
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) return <Skeleton className="h-40 w-full max-w-md mx-auto" />;

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent>
          {orderId ? (
            <>
              <CardTitle className="text-xl font-bold">Order Confirmed!</CardTitle>
              <p className="my-4">Thank you for your purchase.</p>
              <p>Order Ref: <span className="font-mono">{orderId}</span></p>
              <Link href="/">
                <Button className="mt-6">Go to Home</Button>
              </Link>
            </>
          ) : (
            <>
              <CardTitle className="text-xl font-bold">Oops!</CardTitle>
              <p className="my-4">We could not process your payment.</p>
              <Link href="/">
                <Button>Back to Shop</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
