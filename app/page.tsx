import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import logo from "@/app/public/logo.jpeg";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-4">
          <Image src={logo} alt="Logo" width={200} height={200} className="rounded-lg" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
