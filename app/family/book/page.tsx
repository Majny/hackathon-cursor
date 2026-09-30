import { redirect } from "next/navigation";
import { routes } from "@/lib/archive";

export default function BookPage() {
  redirect(routes.stories());
}
