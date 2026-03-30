"use client";
import React from "react";
import { ArrowDown, ArrowUp, Package, Users } from "@/app/lib/lucide";
import Badge from "../ui/badge/Badge";

export const EcommerceMetrics = () => {
  const currentMonth = new Intl.DateTimeFormat("el-GR", {
    month: "long",
  }).format(new Date());

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Users className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Σύνολο Πελατών
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              3,782
            </h4>
          </div>
          <Badge color="success">
            <ArrowUp className="h-4 w-4" />
            11.01%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Package className="h-6 w-6 text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Σύνολο Παραγγελιών
              </span>
              <span className="text-sm capitalize text-gray-500 dark:text-gray-400">
                {currentMonth}
              </span>
            </div>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              325
            </h4>
          </div>

          <Badge color="error">
            <ArrowDown className="h-4 w-4 text-error-500" />
            9.05%
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
};
