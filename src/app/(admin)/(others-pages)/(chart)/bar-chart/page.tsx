import BarChartOne from "@/components/template components/charts/bar/BarChartOne";
import ComponentCard from "@/components/template components/common/ComponentCard";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Paschalidis - Bar Chart"
};

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bar Chart" />
      <div className="space-y-6">
        <ComponentCard title="Bar Chart 1">
          <BarChartOne />
        </ComponentCard>
      </div>
    </div>
  );
}
