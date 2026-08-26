import { Router } from "express";
import healthRoutes from "../health/health.routes.ts"
import sateliteDataRoutes from "../modules/satelites/routes/satelites-info.routes.ts"

const router: Router = Router();

router.use("/health", healthRoutes);
router.use("/satellites/info", sateliteDataRoutes);

export default router;
