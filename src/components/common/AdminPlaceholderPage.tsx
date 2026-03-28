import PageBreadcrumb from "@/components/common/PageBreadCrumb";

type AdminPlaceholderPageProps = {
  title: string;
  description: string;
};

export default function AdminPlaceholderPage({
  title,
  description,
}: AdminPlaceholderPageProps) {
  return (
    <div>
      <PageBreadcrumb pageTitle={title} />

      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="max-w-3xl">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
