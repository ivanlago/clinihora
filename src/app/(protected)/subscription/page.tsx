import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-container";
import { auth } from "@/lib/auth";

import { SubscriptionPlan } from "./_components/subscription-plan";

export default async function SubscriptionPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/authentication");
  }

  if (!session.user.clinic) {
    redirect("/add-clinic");
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Assinaturas</PageTitle>
          <PageDescription>
            Gerencie sua assinatura e planos de pagamento.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        <div className="space-y-4">
          <SubscriptionPlan
            className="w-[300px]"
            active={session.user.plan === "essential"}
            userEmail={session.user.email || ""}
          />
        </div>
      </PageContent>
    </PageContainer>
  );
}
