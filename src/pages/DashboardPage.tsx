import { TopBar } from "@/app/layout/TopBar";
import { SalesRevenueChart } from "@/components/dashboard/SalesRevenueChart";
import { SummaryStatCards } from "@/components/dashboard/SummaryStatCards";
import { StorageAvailabilityCard } from "@/components/dashboard/StorageAvailabilityCard";
import { StockManagementSection } from "@/components/dashboard/StockManagementSection";
import { OrdersTableCard } from "@/components/dashboard/OrdersTableCard";

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <TopBar />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesRevenueChart />
        </div>
        <div>
          <SummaryStatCards />
        </div>
      </div>
      <StorageAvailabilityCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <StockManagementSection />
        <OrdersTableCard />
      </div>
    </div>
  );
}
