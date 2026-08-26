import { brandMarkResponse } from "./brand-mark-response";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return brandMarkResponse(size.width);
}
