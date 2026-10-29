import type { Metadata } from "next";
import SupplierPriceCatalogUploadClient from "./supplier-price-catalog-upload-client";

const title = "Ανέβασμα Τιμοκαταλόγου";

export const metadata: Metadata = {
  title: `${title} | Oval`,
};

export default function SupplierPriceCatalogUploadPage() {
  return <SupplierPriceCatalogUploadClient />;
}
