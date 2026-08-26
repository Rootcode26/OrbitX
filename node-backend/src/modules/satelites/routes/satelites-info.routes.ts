import { Router } from "express";
import { getSatelitesTleData } from "../controllers/satelites-info.controllers";
import { getSgp4Data } from "../controllers/satelites-sgp4-data.controllers";
import { getConjuctionData } from "../controllers/satelites-conjuction.controllers";
import { getMultipleConjuctionData } from "../controllers/satelites-multiple.controllers";

const router: Router = Router();

router.get("/all", getSatelitesTleData);
router.get("/sgp4-data", getSgp4Data);
router.get("/conjunction-data", getConjuctionData);
router.use("/conjunction-data/multiple", getMultipleConjuctionData);

export default router;
