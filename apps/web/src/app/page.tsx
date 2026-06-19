// Owner: apps/web. Root route redirects to the operational dashboard.
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
