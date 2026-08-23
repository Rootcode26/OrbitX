import { Router } from "express";
import { serverHealth, serverReady } from "./health.controllers";
const router: Router = Router();

router.get("/", serverHealth);
router.get("/ready", serverReady)

export default router;
