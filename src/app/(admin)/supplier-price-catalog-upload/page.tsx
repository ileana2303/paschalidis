import type { Metadata } from "next";
import SupplierPriceCatalogUploadClient from "./supplier-price-catalog-upload-client";

const title = "Ανέβασμα Τιμοκαταλόγου";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function SupplierPriceCatalogUploadPage() {
  return <SupplierPriceCatalogUploadClient />;
}
