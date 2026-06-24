// Owner: apps/web. Legacy budget lab route redirected into Settings.
import { redirect } from "next/navigation";

export default async function BudgetLabPage() {
  redirect("/settings");
}
