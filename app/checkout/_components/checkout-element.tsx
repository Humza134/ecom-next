"use client";

import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutElement({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation`,
      },
    });

    if (error) {
      toast.error(error.message || "Payment failed");
      setProcessing(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader><CardTitle>Pay ${amount.toFixed(2)}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <PaymentElement className="w-full" />
          <Button className="w-full mt-4" disabled={processing}>
            {processing ? <Loader2 className="animate-spin h-4 w-4" /> : `Pay $${amount.toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-gray-400">Secured by Stripe</p>
      </CardFooter>
    </Card>
  );
}
