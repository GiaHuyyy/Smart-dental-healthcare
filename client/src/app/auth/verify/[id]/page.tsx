import Verify from "@/components/auth/Verify";

export default async function VerifyEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  if (!resolved?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Lỗi</h1>
          <p className="text-gray-600 mt-2">ID xác thực không hợp lệ</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <Verify id={resolved.id} />
    </>
  );
}
