import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateRfq } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const rfqSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  product_description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  quantity_unit: z.string().min(1, "Unit is required"),
  destination_country: z.string().min(1, "Destination is required"),
  requested_incoterm: z.string().min(1, "Incoterm is required"),
  target_price: z.coerce.number().optional(),
  message: z.string().optional(),
});

type RfqFormValues = z.infer<typeof rfqSchema>;

export default function Rfq() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createRfq = useCreateRfq();

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      product_name: "",
      product_description: "",
      quantity: 100,
      quantity_unit: "units",
      destination_country: "",
      requested_incoterm: "",
      target_price: undefined,
      message: "",
    },
  });

  const onSubmit = (data: RfqFormValues) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    createRfq.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "RFQ Submitted",
          description: "Your request for quotation has been sent to verified suppliers.",
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Submission Failed",
          description: "There was an error submitting your RFQ. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const currentData = form.watch();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 z-10">
        <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
          <img src="/public/logo.png" alt="QDIA Export" className="h-8 w-8 object-contain" />
          QDIA Export
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">Catalog</Link>
          <Link href="/rfq" className="text-sm font-medium hover:text-primary transition-colors text-primary">Post RFQ</Link>
          <Link href="/supplier" className="text-sm font-medium hover:text-primary transition-colors">Supplier Center</Link>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Post a Request for Quotation</h1>
        
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full" />
          <div className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-300" style={{ width: `${(step - 1) * 50}%` }} />
          
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 bg-background px-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"}
              `}>
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? "text-primary" : "text-muted-foreground"}`}>
                {s === 1 ? "Details" : s === 2 ? "Logistics" : "Review"}
              </span>
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Extra Virgin Olive Oil, 500ml glass bottle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                <SelectItem value="tons">Tons</SelectItem>
                                <SelectItem value="liters">Liters</SelectItem>
                                <SelectItem value="units">Units / Pieces</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="target_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Price (USD) - Optional</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 5.50" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Drag & drop files or click to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">Support for JPG, PNG, PDF (Max 10MB)</p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <FormField
                      control={form.control}
                      name="destination_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Country</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. France, Germany, USA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="requested_incoterm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired Incoterm</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Incoterm" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FOB">FOB (Free on Board)</SelectItem>
                              <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                              <SelectItem value="CIF">CIF (Cost, Insurance & Freight)</SelectItem>
                              <SelectItem value="CFR">CFR (Cost & Freight)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Requirements / Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Specify packaging requirements, certifications needed, or port of destination..." 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-muted p-4 rounded-lg space-y-4 text-sm">
                      <h3 className="font-semibold border-b pb-2">Review Your Request</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground block text-xs">Product</span>
                          <span className="font-medium">{currentData.product_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Quantity</span>
                          <span className="font-medium">{currentData.quantity} {currentData.quantity_unit}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Destination</span>
                          <span className="font-medium">{currentData.destination_country}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Incoterm</span>
                          <span className="font-medium">{currentData.requested_incoterm}</span>
                        </div>
                        {currentData.target_price && (
                          <div>
                            <span className="text-muted-foreground block text-xs">Target Price</span>
                            <span className="font-medium">${currentData.target_price} USD</span>
                          </div>
                        )}
                      </div>
                      
                      {currentData.message && (
                        <div>
                          <span className="text-muted-foreground block text-xs">Message</span>
                          <p className="font-medium mt-1 whitespace-pre-wrap">{currentData.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  
                  <Button type="submit" className="gap-2" disabled={createRfq.isPending}>
                    {step === 1 ? "Logistics Details" : step === 2 ? "Review Request" : "Submit RFQ"}
                    {step < 3 && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
