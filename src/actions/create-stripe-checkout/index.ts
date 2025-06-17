"use server";

import { headers } from "next/headers";
import { Stripe } from "stripe";

import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";



export const createStripeCheckout = actionClient.action(async () => {
    const session = await auth.api.getSession({
        headers: await headers(),});


    if (!session?.user) {
        throw new Error("User not found");
    }

    if (!session.user.clinic) {
        throw new Error("Clinic not found");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key not found");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-05-28.basil"})

    const sessionId = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        subscription_data: {
            metadata: { sessionId: session.user.id },
        },
        line_items: [
            {
                price: process.env.STRIPE_ESSENTIAL_PLAN_PRICE_ID || "",
                quantity: 1,
            },
        ]

})
    return { sessionId: sessionId.id };
   
});
