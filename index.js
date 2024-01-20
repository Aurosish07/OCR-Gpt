import express from "express"
import { createWorker } from 'tesseract.js';
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import path from 'path';
import ejs from "ejs"

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(express.static("public"));

//for handling form data as it's not a json
app.use(express.urlencoded({ extended: 0 }))

let name;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const Name = file.fieldname + '-' + uniqueSuffix + extension;
        name = Name;
        cb(null, Name);
    }

})


const upload = multer({ storage: storage })

app.get("/", (req, res) => {
    res.sendFile("public/index.html")
})

app.post("/upload", upload.single('photoImg'), async (req, res) => {


    // console.log(req.file);
    

    if (req.file) {

        (async () => {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(__dirname + "/uploads/" + name);
            console.log(ret.data.text);

            res.render("index.ejs", { text: ret.data.text });
            await worker.terminate();
        })();
    }

})

app.listen(port, () => {
    console.log("The server is listening on the port", port);
})


