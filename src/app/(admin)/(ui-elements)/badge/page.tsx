import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Badge from "@/components/ui/badge/Badge";
import { Plus } from "@/app/lib/lucide";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paschalidis Badges"
};

export default function BadgePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Badges" />
      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              With Light Background
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="light" color="primary">
                Primary
              </Badge>
              <Badge variant="light" color="success">
                Success
              </Badge>{" "}
              <Badge variant="light" color="error">
                Error
              </Badge>{" "}
              <Badge variant="light" color="warning">
                Warning
              </Badge>{" "}
              <Badge variant="light" color="info">
                Info
              </Badge>
              <Badge variant="light" color="light">
                Light
              </Badge>
              <Badge variant="light" color="dark">
                Dark
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              With Solid Background
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="solid" color="primary">
                Primary
              </Badge>
              <Badge variant="solid" color="success">
                Success
              </Badge>{" "}
              <Badge variant="solid" color="error">
                Error
              </Badge>{" "}
              <Badge variant="solid" color="warning">
                Warning
              </Badge>{" "}
              <Badge variant="solid" color="info">
                Info
              </Badge>
              <Badge variant="solid" color="light">
                Light
              </Badge>
              <Badge variant="solid" color="dark">
                Dark
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Light Background with Left Icon
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Primary
              </Badge>
              <Badge variant="light" color="success" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Success
              </Badge>{" "}
              <Badge variant="light" color="error" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Error
              </Badge>{" "}
              <Badge variant="light" color="warning" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Warning
              </Badge>{" "}
              <Badge variant="light" color="info" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Info
              </Badge>
              <Badge variant="light" color="light" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Light
              </Badge>
              <Badge variant="light" color="dark" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Dark
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Solid Background with Left Icon
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Primary
              </Badge>
              <Badge variant="solid" color="success" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Success
              </Badge>{" "}
              <Badge variant="solid" color="error" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Error
              </Badge>{" "}
              <Badge variant="solid" color="warning" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Warning
              </Badge>{" "}
              <Badge variant="solid" color="info" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Info
              </Badge>
              <Badge variant="solid" color="light" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Light
              </Badge>
              <Badge variant="solid" color="dark" startIcon={<Plus className="h-3.5 w-3.5" />}>
                Dark
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Light Background with Right Icon
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Primary
              </Badge>
              <Badge variant="light" color="success" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Success
              </Badge>{" "}
              <Badge variant="light" color="error" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Error
              </Badge>{" "}
              <Badge variant="light" color="warning" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Warning
              </Badge>{" "}
              <Badge variant="light" color="info" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Info
              </Badge>
              <Badge variant="light" color="light" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Light
              </Badge>
              <Badge variant="light" color="dark" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Dark
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Solid Background with Right Icon
            </h3>
          </div>
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 xl:p-10">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Primary
              </Badge>
              <Badge variant="solid" color="success" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Success
              </Badge>{" "}
              <Badge variant="solid" color="error" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Error
              </Badge>{" "}
              <Badge variant="solid" color="warning" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Warning
              </Badge>{" "}
              <Badge variant="solid" color="info" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Info
              </Badge>
              <Badge variant="solid" color="light" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Light
              </Badge>
              <Badge variant="solid" color="dark" endIcon={<Plus className="h-3.5 w-3.5" />}>
                Dark
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
