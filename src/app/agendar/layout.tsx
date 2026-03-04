export default function AgendarLayout({
  children,
  resumo,
}: {
  children: React.ReactNode;
  resumo: React.ReactNode;
}) {
  return (
    <>
      {children}
      {resumo}
    </>
  );
}
