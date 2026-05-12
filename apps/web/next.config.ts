import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /portfolio is now the public-portfolio editor route. The previous
  // 307 redirect to /dev-activity was a non-permanent fallback used
  // during the rename in PR #20 and is no longer needed: any browser
  // that cached it would have re-validated by now (307 is not
  // permanently cached), and the editor page itself is the canonical
  // owner of the slug from this commit onward.
};

export default nextConfig;
