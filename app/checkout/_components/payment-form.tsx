"use client";

import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { ShippingAddress } from "@/app/validations/checkoutZodSchema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutElement from "./checkout-element";

interface PaymentFormProps {
  shippingAddress: ShippingAddress;
  onBack: () => void;
}

export default function PaymentForm({ shippingAddress, onBack }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shippingAddress }),
        });
        const result = await res.json();

        if (!result.success || !result.data?.clientSecret) {
          toast.error(result.message || "Failed to initiate payment");
          onBack();
          return;
        }

        setClientSecret(result.data.clientSecret);
        setAmount(parseFloat(result.data.totalAmount));
      } catch (err) {
        toast.error("Payment session failed");
        onBack();
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [shippingAddress, onBack]);

  if (loading) {
    return (
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Button variant="ghost" onClick={onBack} className="mb-2">← Change Address</Button>

      {!clientSecret ? (
        <Card><CardContent>Unable to start payment.</CardContent></Card>
      ) : (
        <Elements stripe={loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)} options={{ clientSecret }}>
          <CheckoutElement amount={amount} />
        </Elements>
      )}
    </div>
  );
}
