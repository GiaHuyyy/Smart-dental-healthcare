import Verify from "@/components/auth/Verify";

export default function VerifyEmailPage({ params }: { params: any }) {
  const { id } = (params && typeof params.then !== 'function') ? params : undefined;
  // If params is a Promise (rare), we won't have id synchronously; components expecting async params should handle it.
  return (
    <>
      <Verify id={id} />
    </>
  );
}
