require("dotenv").config();

const express = require("express");
const cors = require("cors");

const adminChoferesRouter = require("./adminchofer.route");

const app = express();


app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.json({
        mensaje: "Ubicación Service funcionando 🚀"
    });
});


app.use("/", adminChoferesRouter);


const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(
        `Ubicación Service ejecutándose en el puerto ${PORT}`
    );
});