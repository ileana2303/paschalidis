import LineChartOne from "@/components/template components/charts/line/LineChartOne";
import ComponentCard from "@/components/template components/common/ComponentCard";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Paschalidis Line Chart"
};
export default function LineChart() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Line Chart" />
      <div className="space-y-6">
        <ComponentCard title="Line Chart 1">
          <LineChartOne />
        </ComponentCard>
      </div>
    </div>
  );
}
