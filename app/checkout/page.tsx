"use client";

import { useState } from "react";
import ShippingForm from "./_components/shipping-form";
import PaymentForm from "./_components/payment-form";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { ShippingAddress } from "../validations/checkoutZodSchema";

export default function CheckoutPage() {
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [shippingData, setShippingData] = useState<ShippingAddress | null>(null);

  return (
    <div className={cn("min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4")}>
      <Toaster />
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">
          {step === "shipping" ? "Enter shipping details" : "Complete your payment"}
        </p>
      </div>

      {step === "shipping" && (
        <ShippingForm
          onSuccess={(data) => {
            setShippingData(data);
            setStep("payment");
          }}
        />
      )}

      {step === "payment" && shippingData && (
        <PaymentForm
          shippingAddress={shippingData}
          onBack={() => setStep("shipping")}
        />
      )}
    </div>
  );
}
