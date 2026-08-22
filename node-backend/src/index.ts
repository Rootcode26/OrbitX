import express, { Application } from "express"
import { env } from "./config/env";

const app: Application = express();
const PORT = env.PORT

app.listen(PORT, () => {
  console.log(`Express server is listening at PORT ${PORT}`);
})
