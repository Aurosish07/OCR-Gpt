import express from "express";
import { createWorker } from 'tesseract.js';
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import path from 'path';
import ejs from "ejs";
import { Mutex } from 'async-mutex';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

let name;
const asyncMutex = new Mutex(); // Create a mutex to synchronize access to shared resources

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const Name = file.fieldname + '-' + uniqueSuffix + extension;
        name = Name;
        cb(null, Name);
    }
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", upload.single('photoImg'), async (req, res) => {
    console.log(req.file);

    if (req.file) {
        const imagePath = path.join(__dirname, "uploads", name);

        const release = await asyncMutex.acquire(); // Acquire the mutex

        try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(imagePath);
            console.log(ret.data.text);

            res.render("index.ejs", { text: ret.data.text });
            await worker.terminate();
        } finally {
            release(); // Release the mutex to allow the next request to proceed
        }
    }
});

app.listen(port, () => {
    console.log("The server is listening on the port", port);
});
