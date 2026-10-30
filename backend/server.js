const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectToDb = require("./config/db");
const userRoutes = require("./routes/user.route.js")
const teamRoutes = require("./routes/team.route.js")
const  projectRoutes =  require("./routes/project.route.js")
const taskRoutes = require("./routes/task.routes.js")
const dashboradRoutes =  require("./routes/dashboard.routes.js")


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin:"http://localhost:5173",
  credentials: true
}
));
dotenv.config();

app.get("/", (req, res) => {
  res.send("I From From Backend");
});

app.use("/api/user",userRoutes)
app.use("/api/teams",teamRoutes)
app.use("/api/projects", projectRoutes)
app.use("/api/tasks",taskRoutes )
app.use("/api/dashboard",dashboradRoutes)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  connectToDb();
  console.log(`Server running at port ${PORT}`);
});

module.exports = app;
