import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/template-components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "@/components/template-components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/template-components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/template-components/ecommerce/RecentOrders";
import ActiveBasketsCard from "@/components/template-components/ecommerce/ActiveBasketsCard";

export const metadata: Metadata = {
  title:
    "Paschalidis - ERP Platform",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <EcommerceMetrics />
      </div>

      <div className="col-span-12 flex xl:col-span-7">
        <MonthlySalesChart />
      </div>

      <div className="col-span-12 flex xl:col-span-5">
        <ActiveBasketsCard />
      </div>

      <div className="col-span-12">
        <RecentOrders />
      </div>
    </div>
  );
}
