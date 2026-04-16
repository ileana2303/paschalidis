import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/template components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/template components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/template components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/template components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/template components/ecommerce/RecentOrders";
import DemographicCard from "@/components/template components/ecommerce/DemographicCard";

export const metadata: Metadata = {
  title:
    "Paschalidis - ERP Platform",
};

export default function Ecommerce() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      {/* <div className="col-span-12">
        <StatisticsChart />
      </div> */}

      {/* <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div> */}

      <div className="col-span-12">
        <RecentOrders />
      </div>
    </div>
  );
}
