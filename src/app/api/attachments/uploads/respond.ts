import type { UploadServiceResult } from "@/modules/life-story/application/attachment-upload-service";
import { getCurrentUser } from "@/shared/lib/auth";

export async function withUploadUser<T>(handler: (userId: string) => Promise<UploadServiceResult<T>>) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ code: "unauthorized" }, { status: 401 });
  try {
    const result = await handler(user.id);
    if (!result.ok) return Response.json({ code: result.code }, { status: result.status });
    return Response.json(result.data);
  } catch (error) {
    console.error("[attachments/uploads]", error);
    return Response.json({ code: "server_error" }, { status: 500 });
  }
}
