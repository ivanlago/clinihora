import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/db";
import { user } from "@/db/schema";

export const POST = async (request: Request) => {
 if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe secret key not found");
  }

 const signature = request.headers.get("stripe-signature");
 if (!signature) {
    throw new Error("Missing Stripe signature");
  }

  const text = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-05-28.basil",
  });

  const event = stripe.webhooks.constructEvent(
    text,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )

  switch (event.type) {
   case "invoice.paid": {
     if (!event.data.object.id) {
       throw new Error("Invoice ID not found");
     }

    //  const { subscription, subscription_details, customer } = event.data.object.parent as unknown as {
    //     subscription: string | null;
    //     customer: string | null;
    //     subscription_details?: {
    //       metadata?: {
    //         userId?: string;
    //       };
    //     };
    //  };
     const subscriptionId = event.data.object.parent?.subscription_details?.subscription as string | null;
     const customer = event.data.object.customer as string | null;
     const userId = event.data.object.parent?.subscription_details?.metadata?.userId as string | null;
     
     
     if (!subscriptionId) {
       throw new Error("Subscription not found 1");
     }

     // Handle successful payment for the subscription

    
      if (!userId) {
        throw new Error("User ID not found in subscription metadata");
      }
      
      // Here you can update your database to mark the subscription as active
      console.log("User ID:", userId);
      // Example: await updateUserSubscriptionStatus(userId, "active");
      await db.update(user).set({        
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customer,
        plan: "essential",
      }).where(eq(user.id, userId));    

     break;
   }

    case "customer.subscription.deleted": {
      if (!event.data.object.id) {
        throw new Error("Subscription ID not found");
      }  
      
      const subscription = await stripe.subscriptions.retrieve(
       event.data.object.id
     );
     if (!subscription) {
       throw new Error("Subscription not found 2");
     }

     const userId = subscription.metadata.userId;
      if (!userId) {
        throw new Error("User ID not found in subscription metadata");
      }
      
      console.log("User ID DELETE:", userId);
      
      await db.update(user).set({        
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        plan: null,
      }).where(eq(user.id, userId));
        
    }

  }

  return NextResponse.json({
    received: true,
  });
};