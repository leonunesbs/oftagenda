import type { ReactNode } from "react";
import { ptBR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";

type SignInLayoutProps = {
  children: ReactNode;
};

export default function SignInLayout({ children }: SignInLayoutProps) {
  return <ClerkProvider localization={ptBR}>{children}</ClerkProvider>;
}
