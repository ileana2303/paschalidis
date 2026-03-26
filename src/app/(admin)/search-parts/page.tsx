import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title:
        "Paschalidis - Web Platform",
};

export default function SearchParts() {
    return (
        <div>
            <PageBreadcrumb pageTitle="Αναζήτηση Ανταλλακτικών" />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
                <div className="mx-auto w-full max-w-[630px] text-center">

                    {/* Title */}
                    <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
                        Find the Right Part
                    </h3>

                    {/* Search Bar */}
                    <div className="mt-6 flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search by part name, code, or category..."
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 
                            focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />

                        <button
                            className="px-5 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            Search
                        </button>
                    </div>

                    {/* Optional hint */}
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Try searching using keywords or part numbers
                    </p>

                </div>
            </div>
        </div>
    );
}