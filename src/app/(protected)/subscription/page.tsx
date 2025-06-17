import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-container";

import { SubscriptionPlan } from "./_components/subscription-plan";

export default function SubscriptionPage() {
  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Assinaturas</PageTitle>
          <PageDescription>
            Gerencie sua assinatura e planos de pagamento.
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          <h1>Button</h1>
        </PageActions>
      </PageHeader>
      <PageContent>
        <div className="space-y-4">
          <SubscriptionPlan className="w-[280px]" />
        </div>
      </PageContent>
    </PageContainer>
  );
}
