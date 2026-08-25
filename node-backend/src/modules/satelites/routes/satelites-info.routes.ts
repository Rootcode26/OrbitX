import { Router } from "express";
import { getSatelitesTleData } from "../controllers/satelites-info.controllers";

const router: Router = Router();

router.get("/all", getSatelitesTleData)

export default router;
