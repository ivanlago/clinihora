"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import SingInForm from "./components/sign-in-form";
import SingUpForm from "./components/sign-up-form";

export default function AuthenticationPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Tabs defaultValue="login">
          <TabsList>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <SingInForm />
          </TabsContent>
          <TabsContent value="register">
            <SingUpForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
