import UserProfileCard from "@/components/auth/account-info";
import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Πληροφορίες Λογαριασμού | Paschalidis"
};

export default function AccountPage() {
  return (
    <>
      <PageBreadcrumb
        pageTitle="Πληροφορίες Λογαριασμού"
        backHref="/"
        backLabel="Επιστροφή στην αρχική"
      />
      <UserProfileCard />
    </>
  );
}
