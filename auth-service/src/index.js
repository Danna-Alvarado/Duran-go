require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// AUTH
app.use("/auth", require("./auth.routes"));
app.use("/auth/chofer", require("./auth.chofer"));


// ADMIN
app.use("/admin", require("./admin.choferes"));


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});