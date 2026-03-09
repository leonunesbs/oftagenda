import type { ReactNode } from "react";
import { ptBR } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";

type SignUpLayoutProps = {
  children: ReactNode;
};

export default function SignUpLayout({ children }: SignUpLayoutProps) {
  return <ClerkProvider localization={ptBR}>{children}</ClerkProvider>;
}
