import UserProfileCard from "@/components/user-profile/UserProfileCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Πληροφορίες Λογαριασμού | Paschalidis"
};

export default function Profile() {
  return (
    <>
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
        Πληροφορίες Λογαριασμού
      </h3>
      <UserProfileCard />
    </>
  );
}
