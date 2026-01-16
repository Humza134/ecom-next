"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { shippingAddressSchema, type ShippingAddress } from "@/app/validations/checkoutZodSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

interface ShippingFormProps {
  onSuccess: (data: ShippingAddress) => void;
}

export default function ShippingForm({ onSuccess }: ShippingFormProps) {
  const form = useForm<ShippingAddress>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "PK",
    },
  });

  function onSubmit(values: ShippingAddress) {
    toast.success("Shipping details saved!");
    onSuccess(values);
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="line1" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="line2" render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2 (Optional)</FormLabel>
                <FormControl><Input placeholder="Apartment, suite, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl><Input placeholder="Karachi" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="state" render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl><Input placeholder="Sindh" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="postalCode" render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl><Input placeholder="75500" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <FormField control={form.control} name="country" render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl><Input {...field} disabled className="bg-gray-100" /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <Button type="submit" className="w-full">Continue to Payment</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
