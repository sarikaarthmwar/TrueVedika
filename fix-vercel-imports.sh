#!/usr/bin/env bash
set -e

echo "==> Fixing server/db.ts"
sed -i 's#from "@shared/schema"#from "../shared/schema.js"#' server/db.ts

echo "==> Fixing server/storage.ts"
sed -i 's#from "./db"#from "./db.js"#' server/storage.ts
sed -i 's#from "@shared/schema"#from "../shared/schema.js"#' server/storage.ts

echo "==> Fixing server/auth.ts"
sed -i 's#from "./db"#from "./db.js"#' server/auth.ts
sed -i 's#from "./storage"#from "./storage.js"#' server/auth.ts

echo "==> Fixing server/routes.ts"
sed -i 's#from "./storage"#from "./storage.js"#' server/routes.ts
sed -i 's#from "./auth"#from "./auth.js"#' server/routes.ts
sed -i 's#from "@shared/schema"#from "../shared/schema.js"#' server/routes.ts

echo "==> Fixing server/index.ts"
sed -i 's#from "./routes"#from "./routes.js"#' server/index.ts
sed -i 's#from "./static"#from "./static.js"#' server/index.ts
sed -i 's#await import("./vite")#await import("./vite.js")#' server/index.ts

echo "==> Fixing api/index.ts"
sed -i 's#from "../server/routes"#from "../server/routes.js"#' api/index.ts

echo ""
echo "All import paths fixed."
echo "Next: git add . && git commit -m 'Fix ESM module resolution for Vercel' && git push"
