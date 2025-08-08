import Verify from "@/components/auth/Verify";

export default function VerifyEmailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <>
      <Verify id={id} />
    </>
  );
}
